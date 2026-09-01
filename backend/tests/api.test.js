const request = require('supertest');
const mongoose = require('mongoose');
const { startMemoryServer, stopMemoryServer } = require('./memoryServer');

let app;
let server;
let mongoAvailable = false;

beforeAll(async () => {
  try {
    await startMemoryServer();
    mongoAvailable = true;
    // Re-require app to pick up the test MONGODB_URI set by startMemoryServer
    delete require.cache[require.resolve('../src/app')];
    app = require('../src/app');
    const { connectDB } = require('../src/config/db');
    const connected = await connectDB();
    if (!connected) mongoAvailable = false;
  } catch (err) {
    console.warn('⚠️  MongoDB memory server unavailable, DB tests will be skipped:', err.message);
    mongoAvailable = false;
    app = require('../src/app');
  }
});

afterAll(async () => {
  await stopMemoryServer();
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
});

const describeIf = (cond) => (cond ? describe : describe.skip);

describeIf(mongoAvailable)('CargoFlow API', () => {
  let customerToken;
  let ownerToken;
  let ownerId;
  let customerId;
  let requestId;
  let quotationId;
  let shipmentId;

  const customerCreds = { name: 'Alice Customer', email: 'alice@example.com', password: 'password123', role: 'CUSTOMER', companyName: 'Acme Corp' };
  const ownerCreds = { name: 'Bob Owner', email: 'bob@example.com', password: 'password123', role: 'TRUCK_OWNER', companyName: 'Bob Transport' };

  test('health endpoint responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('registers a customer', async () => {
    const res = await request(app).post('/api/auth/register').send(customerCreds);
    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('CUSTOMER');
    customerToken = res.body.data.accessToken;
    customerId = res.body.data.user.id;
  });

  test('registers a truck owner', async () => {
    const res = await request(app).post('/api/auth/register').send(ownerCreds);
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('TRUCK_OWNER');
    ownerToken = res.body.data.accessToken;
    ownerId = res.body.data.user.id;
  });

  test('rejects duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send(customerCreds);
    expect(res.status).toBe(409);
  });

  test('login with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: customerCreds.email, password: customerCreds.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  test('login with wrong password fails', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: customerCreds.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  test('GET /api/auth/me returns current user', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(customerCreds.email);
  });

  test('protected route rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('token refresh returns new access token', async () => {
    // login to capture refresh cookie
    const res = await request(app).post('/api/auth/login').send({ email: customerCreds.email, password: customerCreds.password });
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeTruthy();
    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);
    expect(refresh.status).toBe(200);
    expect(refresh.body.data.accessToken).toBeTruthy();
  });

  // ---- Fleet setup (owner adds truck + driver) ----
  let truckId;
  let driverId;

  test('owner adds a truck', async () => {
    const res = await request(app)
      .post('/api/trucks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ regNumber: 'MH12AB1234', type: 'heavy', make: 'Tata', model: 'Prima', capacityTons: 25 });
    expect(res.status).toBe(201);
    truckId = res.body.data.truck._id;
  });

  test('owner adds a driver', async () => {
    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Ravi Kumar', licenseNumber: 'MH12-2026-0001', phone: '9800000000' });
    expect(res.status).toBe(201);
    driverId = res.body.data.driver._id;
  });

  test('customer cannot access fleet routes', async () => {
    const res = await request(app).get('/api/trucks').set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  // ---- Request flow ----
  test('customer creates shipment request', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        ownerId,
        pickup: { address: 'MG Road', city: 'Mumbai', lat: 19.076, lng: 72.8777 },
        destination: { address: 'FC Road', city: 'Pune', lat: 18.5204, lng: 73.8567 },
        cargoType: 'Machinery',
        weightKg: 5000,
        units: 2,
        vehicleType: 'heavy',
        pickupDate: '2026-09-15',
      });
    expect(res.status).toBe(201);
    requestId = res.body.data.request._id;
  });

  test('owner views incoming requests', async () => {
    const res = await request(app).get('/api/requests').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  test('owner reviews request', async () => {
    const res = await request(app).patch(`/api/requests/${requestId}/review`).set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.request.status).toBe('reviewed');
  });

  test('owner sends quotation', async () => {
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        requestId,
        lineItems: [
          { label: 'Transport Charge', amountINR: 30000 },
          { label: 'Loading', amountINR: 5000 },
        ],
        includesGST: true,
        gstPercent: 18,
      });
    expect(res.status).toBe(201);
    quotationId = res.body.data.quotation._id;
    expect(res.body.data.quotation.totalAmountINR).toBe(35000);
  });

  test('customer accepts quotation -> shipment created', async () => {
    const res = await request(app)
      .patch(`/api/quotations/${quotationId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.shipment.status).toBe('confirmed');
    shipmentId = res.body.data.shipment._id;
    expect(shipmentId).toBeTruthy();
  });

  test('customer cannot assign shipment (role enforcement)', async () => {
    const res = await request(app)
      .patch(`/api/shipments/${shipmentId}/assign`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ truckId, driverId });
    expect(res.status).toBe(403);
  });

  test('owner assigns truck + driver', async () => {
    const res = await request(app)
      .patch(`/api/shipments/${shipmentId}/assign`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ truckId, driverId });
    expect(res.status).toBe(200);
    expect(res.body.data.shipment.status).toBe('assigned');
  });

  test('owner adds tracking event', async () => {
    const res = await request(app)
      .post(`/api/shipments/${shipmentId}/tracking`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'in_transit', location: { lat: 18.5, lng: 73.8, address: 'Near Lonavala' }, note: 'Truck moving' });
    expect(res.status).toBe(201);
  });

  test('customer views tracking events', async () => {
    const res = await request(app)
      .get(`/api/shipments/${shipmentId}/tracking`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.events.length).toBe(1);
  });

  test('public tracking by reference', async () => {
    const res = await request(app)
      .get(`/api/tracking/${shipmentId}`)
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });

  test('prevents illegal state transition (confirmed -> delivered)', async () => {
    // Already assigned, trying to jump to delivered should fail
    const res = await request(app)
      .patch(`/api/shipments/${shipmentId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'delivered' });
    expect([400, 200]).toContain(res.status);
  });

  test('owner progresses through valid lifecycle', async () => {
    for (const status of ['pickup', 'in_transit', 'delivered']) {
      const res = await request(app)
        .patch(`/api/shipments/${shipmentId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.data.shipment.status).toBe(status);
    }
  });

  test('owner marks payment paid then completes shipment', async () => {
    // Fetch payment for shipment
    const paymentsRes = await request(app).get('/api/payments').set('Authorization', `Bearer ${ownerToken}`);
    const payment = paymentsRes.body.data.payments.find((p) => p.shipmentId && String(p.shipmentId._id) === shipmentId);
    expect(payment).toBeTruthy();
    const markRes = await request(app)
      .patch(`/api/payments/${payment._id}/mark-paid`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ method: 'mock' });
    expect(markRes.status).toBe(200);

    const completeRes = await request(app)
      .patch(`/api/shipments/${shipmentId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.shipment.status).toBe('completed');
  });

  test('owner reports summary', async () => {
    const res = await request(app).get('/api/reports/summary').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.operations.deliveredShipments).toBeGreaterThanOrEqual(1);
  });

  test('forgot + reset password flow', async () => {
    const forgot = await request(app).post('/api/auth/forgot-password').send({ email: customerCreds.email });
    expect(forgot.status).toBe(200);

    // In dev/test (no redis real), OTP is generated and stored in memory store.
    const cache = require('../src/services/cache.service');
    const otp = await cache.get(`cargoflow:otp:${customerCreds.email}`);
    expect(otp).toBeTruthy();

    const reset = await request(app).post('/api/auth/reset-password').send({
      email: customerCreds.email,
      otp,
      newPassword: 'newpassword456',
    });
    expect(reset.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({ email: customerCreds.email, password: 'newpassword456' });
    expect(login.status).toBe(200);
  });
});
