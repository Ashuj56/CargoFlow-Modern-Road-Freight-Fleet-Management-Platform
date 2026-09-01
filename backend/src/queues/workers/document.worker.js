const fs = require('fs');
const path = require('path');
const { createQueue } = require('../index');
const Document = require('../../models/Document');
const Shipment = require('../../models/Shipment');
const Payment = require('../../models/Payment');
const Quotation = require('../../models/Quotation');

const documentQueue = createQueue('document-queue');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function enqueueDocument(jobName, data) {
  return documentQueue.add(jobName, data);
}

function buildInvoiceHtml({ shipment, payment, quotation }) {
  const date = new Date().toLocaleDateString('en-IN');
  const items = quotation?.lineItems
    .map(
      (it) => `<tr><td>${it.label}</td><td style="text-align:right;">₹${it.amountINR.toLocaleString('en-IN')}</td></tr>`
    )
    .join('');

  return `
    <html><body style="font-family:Arial,sans-serif;padding:40px;">
      <h1 style="color:#0A1628;">INVOICE</h1>
      <p>Invoice No: <strong>${payment?.invoiceNumber || '-'}</strong></p>
      <p>Date: ${date}</p>
      <p>Tracking Ref: <strong>${shipment?.trackingRef || '-'}</strong></p>
      <hr/>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr><th style="text-align:left;border-bottom:2px solid #e2e8f0;padding:8px;">Item</th><th style="text-align:right;border-bottom:2px solid #e2e8f0;padding:8px;">Amount</th></tr></thead>
        <tbody>${items || ''}</tbody>
      </table>
      <hr/>
      <h2 style="text-align:right;">TOTAL: ₹${payment?.amountINR?.toLocaleString('en-IN') || 0}</h2>
    </body></html>`;
}

/**
 * Process document job. Generates a simple HTML invoice (saved as .html).
 * In a production setup you'd use pdfkit/puppeteer — this writes a file
 * and records a Document entry.
 */
async function handleDocumentJob(job) {
  const { name, data } = job;

  if (name === 'pdf.generate_invoice') {
    const shipment = await Shipment.findById(data.shipmentId)
      .populate('quotationId')
      .populate('requestId');
    const payment = await Payment.findOne({ shipmentId: data.shipmentId });

    const html = buildInvoiceHtml({ shipment, payment, quotation: shipment?.quotationId });

    const filename = `invoice-${shipment?.trackingRef || data.shipmentId}.html`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, html);

    const doc = await Document.create({
      shipmentId: data.shipmentId,
      type: 'invoice',
      filename,
      url: `${process.env.CUSTOMER_PORTAL_URL || ''}/uploads/${filename}`,
      uploadedBy: data.uploadedBy || null,
    });

    console.log('📄 Invoice generated:', filename);
    return { docId: doc._id, filename };
  }
  return null;
}

if (documentQueue.handlers) {
  documentQueue.handlers.set('*', handleDocumentJob);
}

module.exports = { documentQueue, enqueueDocument };
