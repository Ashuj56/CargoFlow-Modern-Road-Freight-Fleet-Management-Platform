require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { env } = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/request.routes');
const quotationRoutes = require('./routes/quotation.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const trackingRoutes = require('./routes/tracking.routes');
const fleetRoutes = require('./routes/fleet.routes');
const customerRoutes = require('./routes/customer.routes');
const paymentRoutes = require('./routes/payment.routes');
const reportRoutes = require('./routes/report.routes');
const ownerRoutes = require('./routes/owner.routes');
const documentRoutes = require('./routes/document.routes');

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(
  cors({
    origin: [env.CUSTOMER_PORTAL_URL, env.OWNER_PORTAL_URL, 'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve generated uploads (invoices) statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api', trackingRoutes); // includes /api/tracking/:ref and /api/shipments/:id/tracking
app.use('/api', fleetRoutes); // /api/trucks, /api/drivers
app.use('/api/customers', customerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', ownerRoutes); // /api/owners (public)
app.use('/api/documents', documentRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;
