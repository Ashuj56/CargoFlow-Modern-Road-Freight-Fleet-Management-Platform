# CargoFlow — Final Implementation Plan

## Locked Decisions

| Topic | Decision |
|---|---|
| Primary Database | MongoDB Atlas (M0 free cluster) |
| Cache / Pub-Sub | Upstash Redis (free tier, REST URL + token) |
| Job Queue | BullMQ (backed by Upstash Redis) |
| Real-Time | Socket.IO (tracking updates, notifications) |
| Authentication | Email + Password + JWT (bcrypt, no OAuth) |
| Email | Nodemailer + Gmail App Password |
| Maps | Leaflet.js + react-leaflet + OSRM routing |
| Repo Layout | Monorepo — flat folders (not `packages/`) |
| Deployment | Local dev only (Phase 1) |
| Mock Payments | Status tracking only, no real gateway |

---

## Repository Structure

```
cargoflow/
│
├── backend/                        Node.js + Express
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js               MongoDB Atlas connection
│   │   │   ├── redis.js            Upstash Redis client (ioredis)
│   │   │   └── env.js              env validation (zod)
│   │   │
│   │   ├── models/                 Mongoose schemas (10 models)
│   │   │   ├── User.js
│   │   │   ├── Organization.js
│   │   │   ├── Truck.js
│   │   │   ├── Driver.js
│   │   │   ├── Customer.js
│   │   │   ├── ShipmentRequest.js
│   │   │   ├── Quotation.js
│   │   │   ├── Shipment.js
│   │   │   ├── TrackingEvent.js
│   │   │   ├── Payment.js
│   │   │   └── Document.js
│   │   │
│   │   ├── routes/                 Express routers
│   │   │   ├── auth.routes.js
│   │   │   ├── request.routes.js
│   │   │   ├── quotation.routes.js
│   │   │   ├── shipment.routes.js
│   │   │   ├── tracking.routes.js
│   │   │   ├── fleet.routes.js
│   │   │   ├── customer.routes.js
│   │   │   ├── payment.routes.js
│   │   │   └── report.routes.js
│   │   │
│   │   ├── controllers/            Route handler logic
│   │   │   ├── auth.controller.js
│   │   │   ├── request.controller.js
│   │   │   ├── quotation.controller.js
│   │   │   ├── shipment.controller.js
│   │   │   ├── tracking.controller.js
│   │   │   ├── fleet.controller.js
│   │   │   ├── customer.controller.js
│   │   │   ├── payment.controller.js
│   │   │   └── report.controller.js
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.js     JWT verify + Redis cache lookup
│   │   │   ├── authorize.js        Role-based access (CUSTOMER | TRUCK_OWNER | ADMIN)
│   │   │   ├── rateLimiter.js      Redis-backed rate limiting
│   │   │   ├── cache.js            Generic GET route cache wrapper
│   │   │   └── errorHandler.js     Global error handler
│   │   │
│   │   ├── queues/                 BullMQ
│   │   │   ├── index.js            Queue factory
│   │   │   ├── notification.queue.js
│   │   │   └── workers/
│   │   │       ├── email.worker.js      Nodemailer jobs
│   │   │       └── document.worker.js  PDF / invoice generation
│   │   │
│   │   ├── socket/
│   │   │   ├── index.js            Socket.IO server setup
│   │   │   └── handlers/
│   │   │       ├── tracking.handler.js  shipment room events
│   │   │       └── notify.handler.js    real-time alerts
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js     bcrypt, JWT sign/verify, OTP
│   │   │   ├── email.service.js    Nodemailer templates
│   │   │   ├── cache.service.js    Redis get/set/del helpers
│   │   │   └── shipment.service.js State machine transitions
│   │   │
│   │   └── utils/
│   │       ├── ApiError.js         Custom error class
│   │       ├── ApiResponse.js      Consistent response wrapper
│   │       └── constants.js        Status enums, roles
│   │
│   ├── index.js                    App entry point
│   ├── package.json
│   └── .env
│
├── customer-portal/                React + Vite
│   ├── src/
│   │   ├── assets/
│   │   ├── components/             Shared UI primitives
│   │   ├── pages/                  One folder per route
│   │   ├── store/                  Zustand global state
│   │   ├── services/               Axios API client
│   │   └── hooks/                  Custom React hooks
│   ├── package.json
│   └── .env
│
├── owner-portal/                   React + Vite
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── services/
│   │   └── hooks/
│   ├── package.json
│   └── .env
│
├── package.json                    Root — concurrently dev scripts
├── .env.example
└── README.md
```

---

## How to Run

```bash
# From repo root — starts all three simultaneously
npm run dev

# Individual servers
npm run dev:backend      # nodemon src/index.js  →  http://localhost:5000
npm run dev:customer     # Vite dev server       →  http://localhost:3000
npm run dev:owner        # Vite dev server       →  http://localhost:3001

# Tests (separate from running — only for verification phase)
cd backend && npm test   # Jest + Supertest API tests
```

---

## Backend Architecture Detail

### Layer Stack (request flow)

```
HTTP Request
    │
    ▼
Express Router
    │
    ├── rateLimiter middleware     (Redis INCR + EXPIRE)
    ├── authenticate middleware    (JWT verify → Redis cache → DB fallback)
    ├── authorize middleware       (role check)
    ├── cache middleware           (Redis GET — short-circuit on cache hit)
    │
    ▼
Controller
    │
    ├── calls Service (business logic)
    ├── writes to MongoDB via Mongoose
    ├── invalidates/updates Redis cache
    ├── pushes job to BullMQ queue (if notification needed)
    └── emits Socket.IO event (if real-time update needed)
    │
    ▼
ApiResponse wrapper → JSON
```

### Authentication Flow

```
REGISTER
  POST /api/auth/register
    → validate body (zod)
    → check email not taken (MongoDB)
    → hash password (bcrypt, 12 rounds)
    → save User + Customer/Owner profile
    → sign access token (JWT, 15 min)
    → sign refresh token (JWT, 7 days, stored in HttpOnly cookie)
    → cache user session in Redis (TTL 15 min)
    → return access token + user object

LOGIN
  POST /api/auth/login
    → find user by email
    → bcrypt.compare password
    → sign tokens
    → cache session in Redis
    → return access token

AUTHENTICATE MIDDLEWARE (every protected route)
  → extract Bearer token from Authorization header
  → verify JWT signature
  → check Redis cache for { userId → role, name, orgId }
      → cache HIT  : attach to req.user, continue (fast path)
      → cache MISS : query MongoDB, populate cache, continue

LOGOUT
  POST /api/auth/logout
    → delete Redis cache entry  (instant invalidation)
    → clear refresh token cookie

FORGOT PASSWORD
  POST /api/auth/forgot-password
    → find user by email
    → generate 6-digit OTP
    → store OTP in Redis (TTL 10 min)
    → push email job to BullMQ
    → email sent via Gmail SMTP

RESET PASSWORD
  POST /api/auth/reset-password
    → verify OTP from Redis
    → hash new password
    → update MongoDB
    → delete OTP from Redis
    → invalidate all sessions
```

### Token Strategy

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access Token | 15 minutes | JS memory (not localStorage) | Sent in `Authorization: Bearer` header |
| Refresh Token | 7 days | HttpOnly cookie (httpOnly, sameSite: strict) | Get new access token silently |
| OTP | 10 minutes | Redis only | Password reset |

---

## Database Models (MongoDB Atlas)

### `users`
```js
{
  _id, name, email, password (hashed),
  role: enum['CUSTOMER', 'TRUCK_OWNER', 'ADMIN'],
  avatar, organizationId, isActive,
  createdAt, updatedAt
}
Indexes: email (unique)
```

### `organizations`
```js
{
  _id, name, type: enum['fleet_owner', 'business'],
  address, contactEmail, contactPhone, gstNumber,
  ownerId (ref: users), createdAt
}
```

### `trucks`
```js
{
  _id, regNumber, make, model,
  type: enum['light', 'medium', 'heavy', 'flatbed', 'tanker'],
  capacityTons, yearOfManufacture,
  status: enum['available', 'assigned', 'maintenance', 'inactive'],
  ownerId (ref: users), createdAt
}
Indexes: ownerId, status
```

### `drivers`
```js
{
  _id, name, licenseNumber, phone, email,
  status: enum['available', 'on_duty', 'off_duty'],
  assignedTruckId (ref: trucks), ownerId (ref: users)
}
Indexes: ownerId, status
```

### `customers`
```js
{
  _id, userId (ref: users), companyName,
  gstNumber, billingAddress, phone,
  totalShipments, totalSpendINR
}
Indexes: userId (unique)
```

### `shipmentRequests`
```js
{
  _id, customerId (ref: customers),
  ownerId (ref: users),                  // which owner received this
  pickup: { address, city, lat, lng },
  destination: { address, city, lat, lng },
  cargoType: enum['Machinery','Electronics','Chemicals','FMCG','Containers','Agriculture','Other'],
  cargoDescription, weightKg, units,
  vehicleType: enum['light','medium','heavy','flatbed','tanker'],
  pickupDate, additionalRequirements,
  status: enum['pending','reviewed','quoted','accepted','rejected','cancelled'],
  createdAt
}
Indexes: customerId, ownerId, status, createdAt
```

### `quotations`
```js
{
  _id, requestId (ref: shipmentRequests),
  ownerId (ref: users),
  lineItems: [{ label: String, amountINR: Number }],
  totalAmountINR, validUntil,
  status: enum['sent','accepted','declined'],
  notes, createdAt
}
Indexes: requestId, ownerId
```

### `shipments`
```js
{
  _id, requestId, quotationId, customerId, ownerId,
  truckId (ref: trucks), driverId (ref: drivers),
  status: enum['confirmed','assigned','pickup','in_transit','delivered','completed'],
  timeline: [{ status, timestamp, note }],
  estimatedDelivery, actualDelivery,
  trackingRef,                           // short public reference e.g. CF-10245
  createdAt
}
Indexes: customerId, ownerId, status, trackingRef (unique)
```

### `trackingEvents`
```js
{
  _id, shipmentId (ref: shipments),
  status, location: { lat, lng, address },
  timestamp, note, recordedBy (ref: users)
}
Indexes: shipmentId, timestamp
```

### `payments`
```js
{
  _id, shipmentId (ref: shipments),
  customerId, ownerId,
  amountINR,
  status: enum['pending','paid','overdue'],
  method: enum['bank_transfer','upi','cheque','mock'],
  invoiceNumber, dueDate, paidAt
}
Indexes: shipmentId, customerId, status
```

### `documents`
```js
{
  _id, shipmentId (ref: shipments),
  type: enum['invoice','pod','manifest','lr'],
  filename, url, uploadedBy (ref: users), createdAt
}
Indexes: shipmentId
```

---

## REST API — Full Surface

### Auth
```
POST  /api/auth/register           register (role selected on form)
POST  /api/auth/login              email + password → JWT
POST  /api/auth/logout             delete Redis session
POST  /api/auth/refresh            refresh token → new access token
GET   /api/auth/me                 current user (protected)
POST  /api/auth/forgot-password    send OTP via Gmail
POST  /api/auth/reset-password     verify OTP + set new password
```

### Shipment Requests
```
POST   /api/requests               customer creates (CUSTOMER)
GET    /api/requests               customer: own | owner: incoming (both)
GET    /api/requests/:id           single request (both)
PATCH  /api/requests/:id/cancel    customer cancels (CUSTOMER)
PATCH  /api/requests/:id/review    owner marks reviewed (TRUCK_OWNER)
PATCH  /api/requests/:id/reject    owner rejects + reason (TRUCK_OWNER)
```

### Quotations
```
POST   /api/quotations             owner sends quotation (TRUCK_OWNER)
GET    /api/quotations             owner: sent | customer: received (both)
GET    /api/quotations/:id         single (both)
PATCH  /api/quotations/:id/accept  customer accepts → triggers shipment creation
PATCH  /api/quotations/:id/decline customer declines
```

### Shipments
```
GET    /api/shipments              role-filtered list
GET    /api/shipments/:id          single shipment
PATCH  /api/shipments/:id/assign   assign truck + driver (TRUCK_OWNER)
PATCH  /api/shipments/:id/status   update status (TRUCK_OWNER)
PATCH  /api/shipments/:id/complete mark completed after payment (TRUCK_OWNER)
```

### Tracking
```
GET    /api/shipments/:id/tracking   full event log (both)
POST   /api/shipments/:id/tracking   add tracking event + location (TRUCK_OWNER)
GET    /api/tracking/:ref            public tracking by reference code (no auth)
```

### Fleet
```
GET    /api/trucks                 (TRUCK_OWNER)
POST   /api/trucks                 add truck
GET    /api/trucks/:id
PATCH  /api/trucks/:id
DELETE /api/trucks/:id

GET    /api/drivers                (TRUCK_OWNER)
POST   /api/drivers                add driver
GET    /api/drivers/:id
PATCH  /api/drivers/:id
DELETE /api/drivers/:id
```

### Customers (Owner view)
```
GET    /api/customers              (TRUCK_OWNER)
GET    /api/customers/:id          with shipment history
```

### Payments
```
GET    /api/payments               role-filtered
GET    /api/payments/:id
PATCH  /api/payments/:id/mark-paid mock payment (TRUCK_OWNER)
```

### Reports
```
GET    /api/reports/summary        fleet + revenue overview (TRUCK_OWNER)
GET    /api/reports/monthly        monthly breakdown (TRUCK_OWNER)
```

---

## BullMQ — Job Queue

### Queues

```
notification-queue
  ├── job: email.request_received      → notify owner of new request
  ├── job: email.quotation_sent        → notify customer quotation arrived
  ├── job: email.quotation_accepted    → notify owner customer accepted
  ├── job: email.shipment_confirmed    → notify customer booking confirmed
  ├── job: email.status_update         → notify customer of status change
  ├── job: email.password_reset_otp    → send 6-digit OTP
  └── job: email.invoice_ready         → send invoice PDF link

document-queue
  └── job: pdf.generate_invoice        → generate invoice PDF, save to /uploads
```

### Worker config
- Concurrency: 5 per worker
- Retry: 3 attempts with exponential backoff
- On failure: log to MongoDB `failedJobs` collection

---

## Socket.IO — Real-Time Events

### Rooms
- Each shipment gets its own Socket.IO room: `shipment:{shipmentId}`
- Owner joins all shipment rooms for their fleet
- Customer joins rooms for their active shipments

### Events

| Event | Direction | Trigger |
|---|---|---|
| `tracking:update` | Server → Client | Owner posts new tracking event |
| `shipment:status` | Server → Client | Shipment status changes |
| `request:received` | Server → Client | New request arrives (owner dashboard) |
| `quotation:received` | Server → Client | Quotation sent (customer dashboard) |
| `quotation:response` | Server → Client | Customer accepts/declines (owner dashboard) |

---

## Request Lifecycle State Machine

```
CUSTOMER submits request
    │
    ▼ status: pending
    │  Socket.IO → owner: request:received
    │  BullMQ   → email: request_received
    │
OWNER reviews
    │
    ▼ status: reviewed
    │
OWNER sends quotation
    │
    ▼ status: quoted  |  Quotation status: sent
    │  Socket.IO → customer: quotation:received
    │  BullMQ   → email: quotation_sent
    │
CUSTOMER accepts quotation
    │
    ▼ Request status: accepted  |  Quotation status: accepted
    │  Shipment auto-created   |  status: confirmed
    │  Socket.IO → owner: quotation:response
    │  BullMQ   → email: quotation_accepted + shipment_confirmed
    │
OWNER assigns truck + driver
    │
    ▼ Shipment status: assigned
    │
TRUCK departs for pickup
    │
    ▼ Shipment status: pickup
    │  Socket.IO → customer: shipment:status
    │  BullMQ   → email: status_update
    │
CARGO loaded, en route
    │
    ▼ Shipment status: in_transit
    │  Tracking events stream live via Socket.IO
    │
CARGO delivered
    │
    ▼ Shipment status: delivered
    │  BullMQ → pdf.generate_invoice → email: invoice_ready
    │
PAYMENT received
    │
    ▼ Payment status: paid  |  Shipment status: completed
```

---

## Customer Portal — Page Map

| Route | Page | Key features |
|---|---|---|
| `/` | Landing Page | Hero (industrial imagery), features, dual CTA, how-it-works |
| `/login` | Auth | Email + password login, register toggle, role selection |
| `/dashboard` | Dashboard | Stats cards, active shipments, Socket.IO new notifications |
| `/request` | Request Shipment | Multi-field form — pickup, destination, cargo, vehicle, date |
| `/requests` | My Requests | Table with status badges, filter by status |
| `/requests/:id` | Request Detail | Full request + quotation card (Accept / Decline) |
| `/shipments` | My Shipments | Tabs: Active / In Transit / Delivered / All |
| `/shipments/:id` | Shipment Detail | Timeline, truck + driver info, documents |
| `/tracking/:id` | Track Shipment | **Leaflet map + OSRM route + live marker + timeline stepper** |
| `/quotations` | Quotations | All received, line-item breakdown table |
| `/payments` | Payments | Invoice list, amounts, status |
| `/documents` | Documents | POD, invoice, LR downloads |
| `/profile` | Profile | Account + company info, change password |

---

## Owner Portal — Page Map

| Route | Page | Key features |
|---|---|---|
| `/login` | Auth | Email + password, owner branding |
| `/dashboard` | Operations Overview | Fleet KPIs, new request count, revenue, Socket.IO alerts |
| `/fleet/trucks` | Trucks | Fleet table, add/edit truck modal, status indicator |
| `/fleet/drivers` | Drivers | Driver roster, availability badge, assign to truck |
| `/requests` | Requests | Tabs: New / Accepted / Rejected — real-time new request badge |
| `/requests/:id` | Request Detail + Quote | Full request + **Quotation Builder** (line items, total, validity) |
| `/shipments` | Shipments | Tabs: Confirmed / In Transit / Delivered / History |
| `/shipments/:id` | Shipment Detail | Assign truck/driver, update status, add tracking event with location |
| `/tracking` | Live Tracking | **Leaflet map — all active shipments as markers** |
| `/customers` | Customers | Customer list + profile + shipment history |
| `/payments` | Payments | Revenue table, outstanding amounts, mark-paid |
| `/reports` | Reports | Summary charts — revenue, shipment volume, fleet utilization |

---

## Design System

### Color Tokens
```css
/* Background */
--bg-primary:     #F4F5F7;   /* operational page background */
--bg-surface:     #FFFFFF;   /* cards, modals, tables */

/* Brand */
--navy:           #0A1628;   /* customer portal sidebar */
--navy-deep:      #060E1A;   /* owner portal sidebar/header */
--orange:         #E87B2C;   /* industrial accent — badges, CTAs, alerts */
--blue:           #2563EB;   /* links, active nav, info states */

/* Text */
--text-primary:   #1A2332;
--text-muted:     #4A5568;
--text-inverse:   #FFFFFF;

/* Semantic */
--success:        #16A34A;
--warning:        #D97706;
--danger:         #DC2626;
--border:         #E2E8F0;
```

### Typography
- **Font**: Inter (Google Fonts — weights 400, 500, 600, 700)
- Heading hierarchy: `2rem` → `1.5rem` → `1.25rem` → `1rem`
- Body: `0.875rem` / `1rem`

### Shared Component Primitives
| Component | Description |
|---|---|
| `StatusBadge` | Pill badge — color mapped to status string |
| `StatCard` | KPI number + label + optional delta trend |
| `DataTable` | Sortable table with hover rows + pagination |
| `Sidebar` | Collapsible, active link state, notification dot |
| `AppLayout` | Sidebar + topbar wrapper for all portal pages |
| `Modal` | Overlay with focus trap (quotation, assign, confirm) |
| `TrackingTimeline` | Vertical stepper — done / active / pending |
| `RouteMap` | `react-leaflet` wrapper — route + marker |
| `SkeletonLoader` | Content placeholder for loading states |
| `EmptyState` | Illustrated empty state with CTA |

---

## Environment Variables

### `backend/.env`
```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/cargoflow

# JWT
JWT_ACCESS_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Gmail
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Client URLs (CORS)
CUSTOMER_PORTAL_URL=http://localhost:3000
OWNER_PORTAL_URL=http://localhost:3001
```

### `customer-portal/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### `owner-portal/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Build Order — 13 Phases

| Phase | Deliverable | Key files |
|---|---|---|
| **1** | Monorepo scaffold | Root `package.json` (concurrently), `.env.example`, `README.md` |
| **2** | Backend foundation | Express app, MongoDB Atlas connect, Redis client (ioredis + Upstash), all Mongoose models, `ApiError`, `ApiResponse`, `errorHandler` |
| **3** | Auth system | `auth.service.js` (bcrypt, JWT sign/verify, OTP), `auth.routes.js`, `auth.controller.js`, `authenticate` + `authorize` middleware, Redis session cache |
| **4** | Rate limiting + Cache middleware | `rateLimiter.js` (Redis), `cache.js` wrapper |
| **5** | Core REST API | All routes + controllers: requests, quotations, shipments, tracking, fleet, customers, payments, reports |
| **6** | BullMQ + Email workers | `notification.queue.js`, `email.worker.js`, `email.service.js` (Gmail templates), `document.worker.js` |
| **7** | Socket.IO | Server setup, tracking + notify handlers, Redis pub/sub bridge |
| **8** | Design system (both portals) | CSS tokens, Inter font, all shared component primitives |
| **9** | Landing page | `customer-portal/` public marketing page |
| **10** | Auth UIs (both portals) | Login + register screens |
| **11** | Customer portal | All 13 pages — dashboard through profile, Leaflet tracking map, Socket.IO integration |
| **12** | Owner portal | All 12 pages — operations through reports, Leaflet fleet map, Socket.IO alerts |
| **13** | Polish + Testing | Micro-animations, skeleton loaders, empty states, Jest API tests, build validation |

---

## Verification Plan

### Running
```bash
# Terminal 1 — all three
npm run dev

# Or individual
npm run dev:backend    # http://localhost:5000
npm run dev:customer   # http://localhost:3000
npm run dev:owner      # http://localhost:3001
```

### Manual E2E Flows
1. **Customer flow**: Register → Request Shipment → receive quotation via Socket.IO → Accept → Track on Leaflet map → view invoice
2. **Owner flow**: Login → see real-time new request → Quotation Builder → send → assignment → update status to In Transit → add tracking event → map marker moves on customer screen → mark delivered → mark paid
3. **Auth**: Forgot password → OTP email via Gmail → reset → re-login
4. **Role gating**: Customer JWT rejected on `/api/trucks`, owner JWT rejected on customer-only endpoints

### API Tests
```bash
cd backend && npm test   # Jest + Supertest
```
Covers: register, login, token refresh, request CRUD, quotation flow, shipment state transitions, role enforcement.
