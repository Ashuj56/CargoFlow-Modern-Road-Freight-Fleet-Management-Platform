const Shipment = require('../models/Shipment');
const Payment = require('../models/Payment');
const Truck = require('../models/Truck');
const Driver = require('../models/Driver');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const { SHIPMENT_STATUS } = require('../utils/constants');

// Allowed transitions for shipment status
const TRANSITIONS = {
  [SHIPMENT_STATUS.CONFIRMED]: [SHIPMENT_STATUS.ASSIGNED],
  [SHIPMENT_STATUS.ASSIGNED]: [SHIPMENT_STATUS.PICKUP, SHIPMENT_STATUS.IN_TRANSIT],
  [SHIPMENT_STATUS.PICKUP]: [SHIPMENT_STATUS.IN_TRANSIT, SHIPMENT_STATUS.DELIVERED],
  [SHIPMENT_STATUS.IN_TRANSIT]: [SHIPMENT_STATUS.DELIVERED],
  [SHIPMENT_STATUS.DELIVERED]: [SHIPMENT_STATUS.COMPLETED],
  [SHIPMENT_STATUS.COMPLETED]: [],
};

function canTransition(from, to) {
  if (!TRANSITIONS[from]) return false;
  return TRANSITIONS[from].includes(to);
}

function generateTrackingRef() {
  const prefix = 'CF';
  const num = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${num}`;
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${seq}`;
}

function pushTimeline(shipment, status, note = '') {
  shipment.timeline.push({ status, timestamp: new Date(), note });
}

const shipmentService = {
  async createFromQuotation(quotation, request) {
    const trackingRef = generateTrackingRef();
    const shipment = await Shipment.create({
      trackingRef,
      requestId: request._id,
      quotationId: quotation._id,
      customerId: request.customerId,
      ownerId: quotation.ownerId,
      status: SHIPMENT_STATUS.CONFIRMED,
      timeline: [{ status: SHIPMENT_STATUS.CONFIRMED, timestamp: new Date(), note: 'Shipment confirmed' }],
      estimatedDelivery: quotation.validUntil || undefined,
    });

    // Create pending payment
    const invoiceNumber = await generateInvoiceNumber();
    await Payment.create({
      shipmentId: shipment._id,
      customerId: request.customerId,
      ownerId: quotation.ownerId,
      amountINR: quotation.totalAmountINR,
      status: 'pending',
      method: 'mock',
      invoiceNumber,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return shipment;
  },

  async assign({ shipmentId, ownerId, truckId, driverId }) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (shipment.ownerId.toString() !== ownerId.toString())
      throw new ApiError(403, 'Not authorized to assign this shipment');

    const truck = await Truck.findById(truckId);
    if (!truck || truck.ownerId.toString() !== ownerId.toString())
      throw new ApiError(404, 'Truck not found');
    if (truck.status !== 'available') throw new ApiError(400, 'Truck is not available. Current status: ' + truck.status);

    const driver = await Driver.findById(driverId);
    if (!driver || driver.ownerId.toString() !== ownerId.toString())
      throw new ApiError(404, 'Driver not found');
    if (driver.status !== 'available') throw new ApiError(400, 'Driver is not available. Current status: ' + driver.status);

    shipment.truckId = truck._id;
    shipment.driverId = driver._id;

    if (shipment.status === SHIPMENT_STATUS.CONFIRMED) {
      shipment.status = SHIPMENT_STATUS.ASSIGNED;
      pushTimeline(shipment, SHIPMENT_STATUS.ASSIGNED, `Assigned truck ${truck.regNumber} and driver ${driver.name}`);
    }

    await shipment.save();

    // Update truck & driver availability
    truck.status = 'assigned';
    await truck.save();
    driver.status = 'on_duty';
    driver.assignedTruckId = truck._id;
    await driver.save();

    return shipment;
  },

  async updateStatus({ shipmentId, ownerId, status, note = '' }) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (shipment.ownerId.toString() !== ownerId.toString())
      throw new ApiError(403, 'Not authorized to update this shipment');

    if (!canTransition(shipment.status, status)) {
      throw new ApiError(400, `Cannot transition from "${shipment.status}" to "${status}"`);
    }

    shipment.status = status;
    pushTimeline(shipment, status, note);

    if (status === SHIPMENT_STATUS.DELIVERED) {
      shipment.actualDelivery = new Date();
      // Release truck & driver
      if (shipment.truckId) {
        await Truck.updateOne({ _id: shipment.truckId }, { status: 'available' });
      }
      if (shipment.driverId) {
        await Driver.updateOne({ _id: shipment.driverId }, { status: 'available', assignedTruckId: null });
      }
    }

    await shipment.save();
    return shipment;
  },

  async complete({ shipmentId, ownerId }) {
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (shipment.ownerId.toString() !== ownerId.toString())
      throw new ApiError(403, 'Not authorized to complete this shipment');

    if (shipment.status !== SHIPMENT_STATUS.DELIVERED) {
      throw new ApiError(400, 'Shipment must be delivered before it can be completed');
    }

    shipment.status = SHIPMENT_STATUS.COMPLETED;
    pushTimeline(shipment, SHIPMENT_STATUS.COMPLETED, 'Shipment completed after payment');
    await shipment.save();

    // Update customer aggregates
    const payment = await Payment.findOne({ shipmentId: shipment._id, status: 'paid' });
    if (payment) {
      await Customer.updateOne(
        { _id: shipment.customerId },
        { $inc: { totalShipments: 1, totalSpendINR: payment.amountINR } }
      );
    }

    return shipment;
  },
};

module.exports = shipmentService;
