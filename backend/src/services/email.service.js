const nodemailer = require('nodemailer');
const { env, hasGmail, isDevelopment } = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!hasGmail) {
    console.warn('⚠️  Gmail credentials not set. Emails will be logged (not sent).');
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.GMAIL_USER,
      pass: env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

const templates = {
  otp: (name, otp) => ({
    subject: 'CargoFlow - Your Password Reset OTP',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">CargoFlow</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Use the following one-time password (OTP) to reset your password. It expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#E87B2C;text-align:center;padding:16px;background:#F4F5F7;border-radius:8px;">${otp}</div>
        <p style="color:#4A5568;font-size:13px;">If you did not request this, you can ignore this email.</p>
      </div>`,
  }),

  request_received: (request) => ({
    subject: 'CargoFlow - New Shipment Request Received',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">New Shipment Request</h2>
        <p>A new shipment request has arrived:</p>
        <p><strong>Route:</strong> ${request.route || 'N/A'}</p>
        <p><strong>Cargo:</strong> ${request.cargoType || 'N/A'} (${request.weightKg || 0} kg)</p>
        <p style="margin-top:16px;"><a href="${env.CUSTOMER_PORTAL_URL}" style="background:#E87B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Review in Portal</a></p>
      </div>`,
  }),

  quotation_sent: (q) => ({
    subject: 'CargoFlow - You Have a New Quotation',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">Quotation Received</h2>
        <p>A truck owner has sent you a quotation of <strong>₹${q.totalAmountINR?.toLocaleString('en-IN') || 0}</strong>.</p>
        <p style="margin-top:16px;"><a href="${env.CUSTOMER_PORTAL_URL}/quotations" style="background:#E87B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">View Quotation</a></p>
      </div>`,
  }),

  quotation_accepted: () => ({
    subject: 'CargoFlow - Quotation Accepted!',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#16A34A;">Quotation Accepted 🎉</h2>
        <p>The customer has accepted your quotation. A shipment has been created.</p>
      </div>`,
  }),

  shipment_confirmed: (s) => ({
    subject: 'CargoFlow - Shipment Confirmed',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">Shipment Confirmed</h2>
        <p>Your booking is confirmed. Tracking reference: <strong>${s.trackingRef}</strong></p>
        <p style="margin-top:16px;"><a href="${env.CUSTOMER_PORTAL_URL}/tracking/${s._id}" style="background:#E87B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Track Shipment</a></p>
      </div>`,
  }),

  status_update: (s) => ({
    subject: `CargoFlow - Shipment ${s.status?.replace('_', ' ').toUpperCase()}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">Shipment Status Update</h2>
        <p>Your shipment <strong>${s.trackingRef}</strong> is now: <strong>${s.status}</strong></p>
      </div>`,
  }),

  invoice_ready: (s) => ({
    subject: 'CargoFlow - Your Invoice Is Ready',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#0A1628;">Invoice Ready</h2>
        <p>Your invoice for shipment <strong>${s.trackingRef}</strong> is ready to download.</p>
        ${s.invoiceUrl ? `<p style="margin-top:16px;"><a href="${s.invoiceUrl}" style="background:#E87B2C;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;">Download Invoice</a></p>` : ''}
      </div>`,
  }),
};

const emailService = {
  getTemplates() {
    return templates;
  },

  async send({ to, subject, html }) {
    const t = getTransporter();
    if (!to) {
      console.warn('email.send skipped: no recipient');
      return null;
    }
    if (!t) {
      // Dev fallback: log instead of sending
      if (isDevelopment) {
        console.log(`\n📧 [EMAIL LOG] to=${to} subject="${subject}"`);
      }
      return { mocked: true, to, subject };
    }
    try {
      const info = await t.sendMail({ from: env.GMAIL_USER, to, subject, html });
      console.log('📧 Email sent:', to);
      return info;
    } catch (err) {
      console.error('📧 Email send failed:', err.message);
      throw err;
    }
  },
};

module.exports = emailService;
