const { createQueue } = require('./index');
const emailService = require('../services/email.service');
const Shipment = require('../models/Shipment');
const ShipmentRequest = require('../models/ShipmentRequest');
const User = require('../models/User');

const notificationQueue = createQueue('notification-queue');

async function enqueueNotification(jobName, data) {
  return notificationQueue.add(jobName, data);
}

/**
 * Process a notification job. Returns true if handled.
 * Used by both the BullMQ worker and the in-memory fallback.
 */
async function handleNotificationJob(job) {
  const { name, data } = job;
  const templates = emailService.getTemplates();

  switch (name) {
    case 'email.otp':
      await emailService.send({ to: data.email, ...templates.otp(data.name, data.otp) });
      break;

    case 'email.request_received': {
      const t = templates.request_received(data);
      await emailService.send({ to: data.ownerEmail, ...t });
      break;
    }

    case 'email.quotation_sent': {
      const t = templates.quotation_sent(data);
      await emailService.send({ to: data.customerEmail, ...t });
      break;
    }

    case 'email.quotation_accepted':
      await emailService.send({ to: data.ownerEmail, ...templates.quotation_accepted() });
      break;

    case 'email.shipment_confirmed': {
      const shipment = await Shipment.findById(data.shipmentId);
      const t = templates.shipment_confirmed({ trackingRef: shipment?.trackingRef, _id: data.shipmentId });
      await emailService.send({ to: data.customerEmail, ...t });
      break;
    }

    case 'email.status_update': {
      const t = templates.status_update({ trackingRef: data.trackingRef, status: data.status });
      await emailService.send({ to: data.customerEmail, ...t });
      break;
    }

    case 'email.invoice_ready': {
      const t = templates.invoice_ready({ trackingRef: data.trackingRef, invoiceUrl: data.invoiceUrl });
      await emailService.send({ to: data.customerEmail, ...t });
      break;
    }

    default:
      console.warn(`Unknown notification job: ${name}`);
      return false;
  }
  return true;
}

// Register inline fallback handler (memory mode)
if (notificationQueue.handlers) {
  notificationQueue.handlers.set('*', handleNotificationJob);
}

module.exports = { notificationQueue, enqueueNotification, handleNotificationJob };
