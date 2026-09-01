# CargoFlow — Complete System Design

---

## 1. Product Overview

**CargoFlow** is a two-sided digital freight and fleet management platform connecting:

- **Customers** — businesses that need to ship cargo
- **Truck Owners** — fleet operators who fulfill those shipments

The platform handles the full lifecycle: shipment request → quotation → booking → assignment → tracking → delivery → payment.

---

## 2. Scale Context

| Metric | Phase 1 Target | Scale-Ready Ceiling |
|---|---|---|
| Total users | ~2,000 (1K customers + 1K owners) | 100,000+ without rewrite |
| Concurrent users (peak) | ~200–300 | 5,000+ with horizontal scale |
| Shipment requests/day | ~500 | 50,000/day |
| Tracking events/day | ~5,000 | 500,000/day |
| Emails/day | ~2,000 | 200,000/day (queue-backed) |

> **Key principle**: Architecture decisions made now determine whether scaling later is a config change or a full rewrite. We build the right foundation from day one.

---

## 3. High-Level Architecture

```
                        ┌─────────────────────────────┐
                        │       CARGOFLOW PLATFORM      │
                        └─────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
          ┌──────────────────┐                 ┌──────────────────┐
          │ customer-portal/ │                 │  owner-portal/   │
          │  React + Vite    │                 │  React + Vite    │
          │  Port 3000       │                 │  Port 3001       │
          └────────┬─────────┘                 └────────┬─────────┘
                   │                                    │
                   │  HTTP/REST + WebSocket (Socket.IO) │
                   └──────────────┬─────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │       backend/           │
                    │  Node.js + Express       │
                    │  Socket.IO Server        │
                    │  Port 5000               │
                    │                          │
                    │  ┌────────────────────┐  │
                    │  │  Middleware Stack   │  │
                    │  │  Rate Limiter       │  │
                    │  │  Authenticate       │  │
                    │  │  Authorize          │  │
                    │  │  Cache              │  │
                    │  │  Error Handler      │  │
                    │  └────────────────────┘  │
                    └──────────┬──────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
  ┌───────────────┐   ┌────────────────┐   ┌──────────────────┐
  │ MongoDB Atlas │   │ Upstash Redis  │   │ BullMQ Workers   │
  │               │   │                │   │                  │
  │ Primary DB    │   │ Session Cache  │   │ Email Worker     │
  │ 11 Collections│   │ App Cache      │   │ Document Worker  │
  │ Geospatial    │   │ Rate Limiting  │   │ Notification     │
  │ Indexes       │   │ Pub/Sub        │   │   Worker         │
  └───────────────┘   │ Job Queue      │   └──────────────────┘
                      └────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Gmail SMTP        │
                    │   Nodemailer        │
                    │   (Email delivery)  │
                    └─────────────────────┘
```

---

## 4. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 | Customer & Owner portals |
| State Management | Zustand | v4 | Client-side global state |
| HTTP Client | Axios | v1 | API calls + interceptors |
| Maps | Leaflet + react-leaflet | v1.9 + v4 | Route visualization, live tracking |
| Real-Time Client | Socket.IO Client | v4 | Live updates on frontend |
| Backend Runtime | Node.js | v20 LTS | Server runtime |
| Web Framework | Express.js | v4 | REST API server |
| Real-Time Server | Socket.IO | v4 | WebSocket event server |
| Database | MongoDB Atlas | v7 | Primary persistent data store |
| ODM | Mongoose | v8 | Schema modeling + validation |
| Cache / Queue Bus | Upstash Redis | — | Sessions, cache, pub/sub, rate limit |
| Job Queue | BullMQ | v5 | Background job processing |
| Auth | JWT (jsonwebtoken) | — | Access + Refresh tokens |
| Password Hash | bcrypt | 12 rounds | Secure password storage |
| Email | Nodemailer + Gmail | — | Transactional emails |
| Validation | Zod | v3 | Request body validation |
| Process Manager | nodemon (dev) | — | Auto-restart on file change |
| Monorepo Scripts | concurrently | — | Run all 3 servers in one terminal |

---

## 5. Folder Structure

```
cargoflow/                              ← Monorepo root
│
├── package.json                        ← Root: concurrently dev scripts
├── .env.example                        ← Template for all env vars
├── README.md
│
├── backend/                            ← Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   ← MongoDB Atlas connection
│   │   │   ├── redis.js                ← Upstash Redis client (ioredis)
│   │   │   └── env.js                  ← Env validation via Zod
│   │   │
│   │   ├── models/                     ← Mongoose schemas
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
│   │   ├── routes/                     ← Express routers
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
│   │   ├── controllers/                ← Route handler logic
│   │   │   └── [mirrors routes/]
│   │   │
│   │   ├── middleware/
│   │   │   ├── authenticate.js         ← JWT verify + Redis cache lookup
│   │   │   ├── authorize.js            ← Role-based guard
│   │   │   ├── rateLimiter.js          ← Redis-backed rate limiting
│   │   │   ├── cache.js                ← Generic GET cache wrapper
│   │   │   └── errorHandler.js         ← Global error handler
│   │   │
│   │   ├── queues/                     ← BullMQ
│   │   │   ├── index.js                ← Queue factory
│   │   │   ├── notification.queue.js
│   │   │   └── workers/
│   │   │       ├── email.worker.js
│   │   │       └── document.worker.js
│   │   │
│   │   ├── socket/
│   │   │   ├── index.js                ← Socket.IO server setup
│   │   │   └── handlers/
│   │   │       ├── tracking.handler.js
│   │   │       └── notify.handler.js
│   │   │
│   │   ├── services/
│   │   │   ├── auth.service.js
│   │   │   ├── email.service.js
│   │   │   ├── cache.service.js
│   │   │   └── shipment.service.js
│   │   │
│   │   └── utils/
│   │       ├── ApiError.js
│   │       ├── ApiResponse.js
│   │       └── constants.js
│   │
│   ├── index.js                        ← Entry point
│   ├── package.json
│   └── .env
│
├── customer-portal/                    ← React + Vite (Port 3000)
│   ├── src/
│   │   ├── assets/
│   │   ├── components/                 ← Shared UI primitives
│   │   ├── pages/                      ← One folder per route
│   │   ├── store/                      ← Zustand stores
│   │   ├── services/                   ← Axios API client
│   │   └── hooks/                      ← Custom React hooks
│   ├── package.json
│   └── .env
│
└── owner-portal/                       ← React + Vite (Port 3001)
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   ├── pages/
    │   ├── store/
    │   ├── services/
    │   └── hooks/
    ├── package.json
    └── .env
```

---

## 6. Database Design (MongoDB Atlas)

### Why MongoDB?

| Reason | Detail |
|---|---|
| Document model | `shipments` with embedded `timeline[]`, `quotations` with `lineItems[]` — natural JSON, no joins |
| Flexible schema | Cargo types, charges, tracking notes all vary per shipment |
| Geospatial | Native `2dsphere` index for lat/lng truck location queries |
| Atlas | Free M0 tier for Phase 1, scales to dedicated clusters without code changes |

### Collections & Schemas

#### `users`
```
{
  _id:           ObjectId
  name:          String (required)
  email:         String (required, unique, lowercase)
  password:      String (bcrypt hash, required)
  role:          Enum ['CUSTOMER', 'TRUCK_OWNER', 'ADMIN']
  avatar:        String (url, optional)
  organizationId: ObjectId (ref: organizations)
  isActive:      Boolean (default: true)
  lastLogin:     Date
  createdAt:     Date
  updatedAt:     Date
}
Indexes: email (unique)
```

#### `organizations`
```
{
  _id:           ObjectId
  name:          String (required)
  type:          Enum ['fleet_owner', 'business']
  address:       String
  city:          String
  state:         String
  gstNumber:     String
  contactEmail:  String
  contactPhone:  String
  ownerId:       ObjectId (ref: users)
  createdAt:     Date
}
Indexes: ownerId
```

#### `trucks`
```
{
  _id:           ObjectId
  regNumber:     String (required, unique)
  make:          String
  model:         String
  year:          Number
  type:          Enum ['light', 'medium', 'heavy', 'flatbed', 'tanker', 'container']
  capacityTons:  Number
  status:        Enum ['available', 'assigned', 'maintenance', 'inactive']
  ownerId:       ObjectId (ref: users)
  createdAt:     Date
}
Indexes: ownerId, status, regNumber (unique)
```

#### `drivers`
```
{
  _id:             ObjectId
  name:            String (required)
  licenseNumber:   String (required, unique)
  phone:           String
  email:           String
  status:          Enum ['available', 'on_duty', 'off_duty']
  assignedTruckId: ObjectId (ref: trucks, nullable)
  ownerId:         ObjectId (ref: users)
  createdAt:       Date
}
Indexes: ownerId, status
```

#### `customers`
```
{
  _id:            ObjectId
  userId:         ObjectId (ref: users, unique)
  companyName:    String
  gstNumber:      String
  billingAddress: String
  phone:          String
  totalShipments: Number (default: 0)
  totalSpendINR:  Number (default: 0)
  createdAt:      Date
}
Indexes: userId (unique)
```

#### `shipmentRequests`
```
{
  _id:                   ObjectId
  customerId:            ObjectId (ref: customers)
  ownerId:               ObjectId (ref: users)        ← receiving fleet owner
  pickup: {
    address:             String
    city:                String
    lat:                 Number
    lng:                 Number
  }
  destination: {
    address:             String
    city:                String
    lat:                 Number
    lng:                 Number
  }
  estimatedDistanceKm:   Number                       ← from OSRM
  cargoType:             Enum ['Machinery','Electronics','Chemicals',
                               'FMCG','Containers','Agriculture','Other']
  cargoDescription:      String
  weightKg:              Number
  units:                 Number
  vehicleType:           Enum ['light','medium','heavy','flatbed','tanker']
  pickupDate:            Date
  additionalRequirements: String
  status:                Enum ['pending','reviewed','quoted',
                               'accepted','rejected','cancelled']
  rejectionReason:       String (nullable)
  createdAt:             Date
  updatedAt:             Date
}
Indexes: customerId, ownerId, status, createdAt (desc)
```

#### `quotations`
```
{
  _id:          ObjectId
  requestId:    ObjectId (ref: shipmentRequests)
  ownerId:      ObjectId (ref: users)
  lineItems: [
    {
      label:      String   (e.g. 'Transport Charge')
      amountINR:  Number
    }
  ]
  totalAmountINR: Number
  includesGST:    Boolean
  gstPercent:     Number (default: 18)
  validUntil:     Date
  notes:          String
  status:         Enum ['sent', 'accepted', 'declined']
  createdAt:      Date
}
Indexes: requestId, ownerId, status
```

#### `shipments`
```
{
  _id:               ObjectId
  trackingRef:       String (unique, e.g. 'CF-10245')
  requestId:         ObjectId (ref: shipmentRequests)
  quotationId:       ObjectId (ref: quotations)
  customerId:        ObjectId (ref: customers)
  ownerId:           ObjectId (ref: users)
  truckId:           ObjectId (ref: trucks, nullable)
  driverId:          ObjectId (ref: drivers, nullable)
  status:            Enum ['confirmed','assigned','pickup',
                           'in_transit','delivered','completed']
  timeline: [
    {
      status:     String
      timestamp:  Date
      note:       String
    }
  ]
  estimatedDelivery: Date
  actualDelivery:    Date (nullable)
  createdAt:         Date
  updatedAt:         Date
}
Indexes: trackingRef (unique), customerId, ownerId, status
```

#### `trackingEvents`
```
{
  _id:        ObjectId
  shipmentId: ObjectId (ref: shipments)
  status:     String
  location: {
    lat:      Number
    lng:      Number
    address:  String
  }
  timestamp:  Date (default: now)
  note:       String
  recordedBy: ObjectId (ref: users)
}
Indexes: shipmentId, timestamp (desc)
TTL Index: timestamp (auto-delete after 90 days for storage management)
```

#### `payments`
```
{
  _id:           ObjectId
  shipmentId:    ObjectId (ref: shipments)
  customerId:    ObjectId (ref: customers)
  ownerId:       ObjectId (ref: users)
  amountINR:     Number
  status:        Enum ['pending', 'paid', 'overdue']
  method:        Enum ['bank_transfer', 'upi', 'cheque', 'mock']
  invoiceNumber: String (unique, e.g. 'INV-2026-001')
  dueDate:       Date
  paidAt:        Date (nullable)
  createdAt:     Date
}
Indexes: shipmentId, customerId, ownerId, status
```

#### `documents`
```
{
  _id:         ObjectId
  shipmentId:  ObjectId (ref: shipments)
  type:        Enum ['invoice', 'pod', 'manifest', 'lr']
  filename:    String
  url:         String
  uploadedBy:  ObjectId (ref: users)
  createdAt:   Date
}
Indexes: shipmentId, type
```

---

## 7. REST API — Complete Endpoint Map

### Base URL: `http://localhost:5000/api`

### Response Envelope (all responses)
```json
{
  "success": true,
  "message": "Shipment request created",
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

### Error Envelope
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [ { "field": "weightKg", "message": "Must be a positive number" } ]
}
```

---

### Auth Endpoints

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/auth/register` | ❌ | — | Register new user (role in body) |
| POST | `/auth/login` | ❌ | — | Email + password → access + refresh tokens |
| POST | `/auth/logout` | ✅ | Any | Delete Redis session, clear cookie |
| POST | `/auth/refresh` | ❌ | — | Refresh token cookie → new access token |
| GET | `/auth/me` | ✅ | Any | Current user profile |
| POST | `/auth/forgot-password` | ❌ | — | Send 6-digit OTP to email |
| POST | `/auth/reset-password` | ❌ | — | Verify OTP + set new password |
| PATCH | `/auth/change-password` | ✅ | Any | Change password (requires current password) |

---

### Shipment Requests

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/requests` | ✅ | CUSTOMER | Create new shipment request |
| GET | `/requests` | ✅ | Both | Customer: own requests \| Owner: incoming |
| GET | `/requests/:id` | ✅ | Both | Single request detail |
| PATCH | `/requests/:id/cancel` | ✅ | CUSTOMER | Cancel a pending request |
| PATCH | `/requests/:id/review` | ✅ | TRUCK_OWNER | Mark as reviewed |
| PATCH | `/requests/:id/reject` | ✅ | TRUCK_OWNER | Reject with reason |

---

### Quotations

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| POST | `/quotations` | ✅ | TRUCK_OWNER | Create & send quotation for a request |
| GET | `/quotations` | ✅ | Both | Owner: sent \| Customer: received |
| GET | `/quotations/:id` | ✅ | Both | Single quotation with line items |
| PATCH | `/quotations/:id/accept` | ✅ | CUSTOMER | Accept → auto-creates shipment |
| PATCH | `/quotations/:id/decline` | ✅ | CUSTOMER | Decline quotation |

---

### Shipments

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/shipments` | ✅ | Both | Role-filtered list with status filter |
| GET | `/shipments/:id` | ✅ | Both | Full shipment detail |
| PATCH | `/shipments/:id/assign` | ✅ | TRUCK_OWNER | Assign truck + driver |
| PATCH | `/shipments/:id/status` | ✅ | TRUCK_OWNER | Update status (pickup/in_transit/delivered) |
| PATCH | `/shipments/:id/complete` | ✅ | TRUCK_OWNER | Mark completed after payment |

---

### Tracking

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/shipments/:id/tracking` | ✅ | Both | Full tracking event log |
| POST | `/shipments/:id/tracking` | ✅ | TRUCK_OWNER | Add tracking event + GPS location |
| GET | `/tracking/:ref` | ❌ | Public | Public tracking by reference (e.g. CF-10245) |

---

### Fleet

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/trucks` | ✅ | TRUCK_OWNER | Owner's truck list |
| POST | `/trucks` | ✅ | TRUCK_OWNER | Add truck |
| GET | `/trucks/:id` | ✅ | TRUCK_OWNER | Truck detail |
| PATCH | `/trucks/:id` | ✅ | TRUCK_OWNER | Update truck |
| DELETE | `/trucks/:id` | ✅ | TRUCK_OWNER | Remove truck |
| GET | `/drivers` | ✅ | TRUCK_OWNER | Driver roster |
| POST | `/drivers` | ✅ | TRUCK_OWNER | Add driver |
| GET | `/drivers/:id` | ✅ | TRUCK_OWNER | Driver detail |
| PATCH | `/drivers/:id` | ✅ | TRUCK_OWNER | Update driver |
| DELETE | `/drivers/:id` | ✅ | TRUCK_OWNER | Remove driver |

---

### Customers (Owner View)

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/customers` | ✅ | TRUCK_OWNER | Customer list |
| GET | `/customers/:id` | ✅ | TRUCK_OWNER | Customer profile + shipment history |

---

### Payments

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/payments` | ✅ | Both | Role-filtered payment list |
| GET | `/payments/:id` | ✅ | Both | Payment detail |
| PATCH | `/payments/:id/mark-paid` | ✅ | TRUCK_OWNER | Mark as paid (mock) |

---

### Reports

| Method | Route | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/reports/summary` | ✅ | TRUCK_OWNER | Fleet + revenue overview |
| GET | `/reports/monthly` | ✅ | TRUCK_OWNER | Monthly breakdown |

---

## 8. Authentication Flow

### Registration
```
POST /api/auth/register
Body: { name, email, password, role, companyName }

1. Validate body with Zod schema
2. Check email uniqueness in MongoDB
3. Hash password: bcrypt.hash(password, 12)
4. Create User document in MongoDB
5. Create Customer or Organization profile based on role
6. Sign access token  (JWT, 15 min, payload: { userId, role })
7. Sign refresh token (JWT, 7 days)
8. Cache session in Redis:
     SET session:{userId} { name, role, orgId } EX 900
9. Set refresh token in HttpOnly cookie
10. Return: { accessToken, user }
```

### Login
```
POST /api/auth/login
Body: { email, password }

1. Find user by email in MongoDB
2. bcrypt.compare(password, user.password)
3. Sign access + refresh tokens
4. Cache session in Redis (TTL 15 min)
5. Set refresh token cookie
6. Update user.lastLogin in MongoDB
7. Return: { accessToken, user }
```

### Authenticate Middleware (every protected route)
```
Authorization: Bearer <accessToken>

1. Extract token from header
2. jwt.verify(token, JWT_ACCESS_SECRET)
   → Invalid/expired: 401 Unauthorized
3. Check Redis: GET session:{userId}
   → Cache HIT:  attach cached data to req.user → FAST PATH (1–2ms)
   → Cache MISS: query MongoDB for user
                 re-cache in Redis
                 attach to req.user
4. Continue to next middleware
```

### Token Refresh
```
POST /api/auth/refresh
Cookie: refreshToken=<token>

1. Read refresh token from HttpOnly cookie
2. jwt.verify(token, JWT_REFRESH_SECRET)
3. Sign new access token (15 min)
4. Refresh Redis session TTL
5. Return: { accessToken }
```

### Logout
```
POST /api/auth/logout

1. DEL session:{userId}  from Redis  ← instant invalidation
2. Clear refresh token cookie
3. Return: 200 OK
```

### Forgot Password / OTP Reset
```
POST /api/auth/forgot-password
Body: { email }

1. Find user by email
2. Generate 6-digit OTP: Math.floor(100000 + Math.random() * 900000)
3. Store in Redis: SET otp:{email} <otp> EX 600  (10 min TTL)
4. Push email job to BullMQ notification queue
5. Email sent by worker via Gmail SMTP
6. Return: { message: "OTP sent" }

POST /api/auth/reset-password
Body: { email, otp, newPassword }

1. GET otp:{email} from Redis
2. Compare OTP — mismatch: 400 Bad Request
3. bcrypt.hash(newPassword, 12)
4. Update user.password in MongoDB
5. DEL otp:{email} from Redis
6. DEL session:{userId} from Redis  ← force re-login
7. Return: 200 OK
```

---

## 9. Redis Architecture (Upstash)

```
MongoDB = Source of truth  (persistent, durable)
Redis   = Speed layer      (ephemeral, fast, coordination)
```

### Key Namespaces

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `session:{userId}` | Hash | 900s (15 min) | Cached user session |
| `otp:{email}` | String | 600s (10 min) | Password reset OTP |
| `rate:{ip}` | String | 60s | Rate limit counter per IP |
| `rate:{userId}` | String | 60s | Rate limit counter per user |
| `cache:dashboard:{userId}` | String (JSON) | 60s | Dashboard stats cache |
| `cache:fleet:{ownerId}` | String (JSON) | 30s | Fleet list cache |
| `cache:tracking:{shipmentId}` | String (JSON) | 15s | Tracking events cache |
| `pubsub:shipment:{shipmentId}` | Channel | — | Tracking event pub/sub |
| `pubsub:notify:{userId}` | Channel | — | User notification pub/sub |

### Rate Limiting Logic
```
On every API request:
  key = rate:{ip}:{route}
  count = INCR key
  if count == 1: EXPIRE key 60
  if count > limit: return 429 Too Many Requests
```

### Cache Middleware (GET routes)
```
async function cache(ttl) {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}:${req.user.id}`
    const cached = await redis.get(key)
    if (cached) return res.json(JSON.parse(cached))  ← short-circuit

    res.sendResponse = res.json
    res.json = (data) => {
      redis.setex(key, ttl, JSON.stringify(data))   ← cache response
      res.sendResponse(data)
    }
    next()
  }
}

// Usage on routes:
router.get('/reports/summary', authenticate, cache(60), reportController.summary)
```

---

## 10. BullMQ — Job Queue

### Architecture
```
Controller                     Redis Queue              Worker Process
    │                               │                        │
    │── addJob('email.otp', data) ──▶│                        │
    │                               │── dequeue job ─────────▶│
    │                               │                        │── Gmail SMTP
    │                               │                        │── mark complete
    │                               │◀── job done ───────────│
```

### Queues

#### `notification-queue`

| Job Name | Triggered By | Payload | Action |
|---|---|---|---|
| `email.otp` | Forgot password | `{ email, otp, name }` | Send OTP email |
| `email.request_received` | Customer submits | `{ ownerEmail, requestId, route }` | Notify owner |
| `email.quotation_sent` | Owner sends quote | `{ customerEmail, quotationId, total }` | Notify customer |
| `email.quotation_accepted` | Customer accepts | `{ ownerEmail, requestId }` | Notify owner |
| `email.shipment_confirmed` | Booking created | `{ customerEmail, trackingRef }` | Booking confirmation |
| `email.status_update` | Status changes | `{ customerEmail, status, trackingRef }` | Status notification |
| `email.invoice_ready` | Delivered | `{ customerEmail, invoiceUrl }` | Invoice email |

#### `document-queue`

| Job Name | Triggered By | Action |
|---|---|---|
| `pdf.generate_invoice` | Shipment delivered | Generate PDF invoice, save to `/uploads`, create Document record |

### Worker Configuration
```js
const worker = new Worker('notification-queue', processor, {
  connection: redisConnection,
  concurrency: 5,           // 5 jobs processed simultaneously
})

// Retry on failure
const queueOptions = {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,  // keep last 100 completed jobs
    removeOnFail: 500,      // keep last 500 failed jobs
  }
}
```

---

## 11. Socket.IO — Real-Time Layer

### Server Setup
```
Express HTTP Server
    └── Socket.IO attached to same port (5000)
         └── Redis Pub/Sub adapter (for multi-instance scaling)
```

### Rooms
- Each shipment: room `shipment:{shipmentId}`
- Each user: room `user:{userId}`
- Owner joins all their shipment rooms on connect
- Customer joins their active shipment rooms on connect

### Events

| Event Name | Direction | Emitted When | Payload |
|---|---|---|---|
| `tracking:update` | Server → Client | Owner adds tracking event | `{ shipmentId, location, status, timestamp }` |
| `shipment:status` | Server → Client | Shipment status changes | `{ shipmentId, newStatus, trackingRef }` |
| `request:new` | Server → Owner | Customer submits request | `{ requestId, route, cargoType }` |
| `quotation:received` | Server → Customer | Owner sends quotation | `{ quotationId, totalAmount }` |
| `quotation:response` | Server → Owner | Customer accepts/declines | `{ quotationId, status }` |
| `notification:bell` | Server → Client | Any notification | `{ message, type, link }` |

### Tracking Update Flow
```
Owner hits PATCH /api/shipments/:id/tracking
    │
    ▼
Controller saves TrackingEvent to MongoDB
    │
    ▼
Controller emits to Redis pub/sub channel: pubsub:shipment:{id}
    │
    ▼
Socket.IO Redis adapter picks up event
    │
    ▼
Broadcasts to all clients in room shipment:{id}
    │
    ▼
Customer's Leaflet map moves truck marker to new lat/lng
```

---

## 12. Request Lifecycle — Complete State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST LIFECYCLE                        │
└─────────────────────────────────────────────────────────────┘

CUSTOMER fills Request Shipment form (3-step)
  Step 1: Pickup location + Destination + Cargo details
  Step 2: Schedule + Vehicle type
  Step 3: Review + Submit
       │
       │ POST /api/requests
       ▼
  ShipmentRequest.status = 'pending'
       │
       ├── BullMQ: email.request_received → notify owner
       └── Socket.IO: request:new → owner dashboard bell

OWNER sees new request on dashboard
       │
       │ PATCH /api/requests/:id/review
       ▼
  ShipmentRequest.status = 'reviewed'

OWNER builds quotation (line items + GST + validity)
       │
       │ POST /api/quotations
       ▼
  Quotation.status = 'sent'
  ShipmentRequest.status = 'quoted'
       │
       ├── BullMQ: email.quotation_sent → notify customer
       └── Socket.IO: quotation:received → customer dashboard

CUSTOMER receives quotation — sees line items, total, validity
       │
       ├── ACCEPT: PATCH /api/quotations/:id/accept
       │     Quotation.status = 'accepted'
       │     ShipmentRequest.status = 'accepted'
       │     Shipment auto-created:
       │       Shipment.status = 'confirmed'
       │       Shipment.trackingRef = 'CF-XXXXX'
       │       Payment record created: status = 'pending'
       │     BullMQ: email.shipment_confirmed → customer
       │     Socket.IO: quotation:response → owner
       │
       └── DECLINE: PATCH /api/quotations/:id/decline
             Quotation.status = 'declined'
             ShipmentRequest.status → back to 'pending'
             Owner can re-quote

OWNER assigns truck + driver
       │
       │ PATCH /api/shipments/:id/assign
       │   { truckId, driverId }
       ▼
  Shipment.status = 'assigned'
  Truck.status = 'assigned'
  Driver.status = 'on_duty'

TRUCK departs for pickup location
       │
       │ PATCH /api/shipments/:id/status
       │   { status: 'pickup' }
       │ POST /api/shipments/:id/tracking
       │   { location, note: 'Truck arrived at pickup' }
       ▼
  Shipment.status = 'pickup'
  TrackingEvent saved
  Socket.IO: tracking:update + shipment:status → customer
  BullMQ: email.status_update → customer

CARGO loaded, truck departs
       │
       │ PATCH /api/shipments/:id/status { status: 'in_transit' }
       ▼
  Shipment.status = 'in_transit'
  [Owner continues adding tracking events with GPS coords]
  [Customer sees live map updates via Socket.IO]

CARGO delivered
       │
       │ PATCH /api/shipments/:id/status { status: 'delivered' }
       ▼
  Shipment.status = 'delivered'
  Shipment.actualDelivery = now()
  Truck.status = 'available'
  Driver.status = 'available'
  BullMQ: pdf.generate_invoice → generate PDF
  BullMQ: email.invoice_ready → customer
  Payment.status = 'pending' (due date set)

PAYMENT received
       │
       │ PATCH /api/payments/:id/mark-paid { method }
       ▼
  Payment.status = 'paid'
  Payment.paidAt = now()
  Shipment.status = 'completed'
  Customer.totalSpendINR += amount
  Customer.totalShipments += 1
```

---

## 13. Map Integration (Leaflet.js)

### Libraries
- `leaflet` — core map library
- `react-leaflet` — React wrapper
- `leaflet-routing-machine` — draw routes between coordinates

### Tile Layer
```js
// OpenStreetMap — free, no API key required
<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
```

### Route Drawing (OSRM Demo API)
```
GET http://router.project-osrm.org/route/v1/driving/
    {pickup.lng},{pickup.lat};{dest.lng},{dest.lat}
    ?overview=full&geometries=geojson

Response: GeoJSON polyline → drawn on map with Leaflet Polyline
```

### Tracking Screen
```
1. Load tracking events from GET /api/shipments/:id/tracking
2. Draw route line between pickup and destination (OSRM)
3. Place truck marker at latest trackingEvent.location
4. Subscribe to Socket.IO room shipment:{id}
5. On tracking:update event → smoothly animate marker to new lat/lng
6. Timeline stepper updates in sync with shipment status
```

### Owner Fleet Map (Tracking Overview)
```
1. Load all active shipments for owner
2. For each: fetch latest trackingEvent
3. Render one marker per active shipment
4. Clicking a marker shows shipment mini-card
5. Socket.IO updates all markers in real-time
```

---

## 14. Security Design

| Threat | Mitigation |
|---|---|
| Brute force login | Rate limit: 5 login attempts per IP per minute (Redis) |
| Token theft | Access token: 15 min TTL. Refresh: HttpOnly cookie (not accessible via JS) |
| Session hijacking | Instant logout via Redis DEL — no waiting for JWT expiry |
| Cross-portal access | Role middleware on every route — CUSTOMER cannot hit `/api/trucks` |
| Mass request spam | Rate limit: 10 requests/min per user on POST endpoints |
| Password storage | bcrypt with 12 salt rounds — not reversible |
| CORS | Strict origin whitelist: only ports 3000 and 3001 allowed |
| Injection | Mongoose sanitizes queries; Zod validates all input |
| Sensitive env vars | Never committed — `.env` in `.gitignore`, `.env.example` as template |

---

## 15. Performance Design

| Optimization | Implementation |
|---|---|
| Auth fast path | JWT payload cached in Redis → avoid DB lookup on every request |
| Dashboard caching | Stats cached 60s in Redis — not recalculated on every page load |
| Tracking cache | Last 20 events cached 15s — frequently polled during transit |
| Async notifications | All emails/PDFs via BullMQ — API response is never blocked |
| DB indexes | All foreign key fields + status fields indexed |
| TTL cleanup | TrackingEvents auto-deleted after 90 days (MongoDB TTL index) |
| Socket over polling | Socket.IO push instead of client polling — no wasted requests |

---

## 16. Scalability Path

### Phase 1 (Current): Single Node
```
1 × Node.js process + MongoDB Atlas M0 + Upstash Redis
→ Handles 200–300 concurrent users comfortably
```

### Phase 2: Multi-Instance (when needed)
```
Add PM2 cluster mode:  pm2 start index.js -i max
Add Socket.IO Redis adapter: @socket.io/redis-adapter
→ Multiple Node processes share Redis state
→ Socket.IO events route correctly across instances
→ No code changes required — just config
```

### Phase 3: Horizontal Scale (production)
```
Load balancer (NGINX) → N × Node.js instances
MongoDB Atlas M10+ (dedicated cluster)
Upstash Redis Pro (higher throughput)
→ Handles 10,000+ concurrent users
```

---

## 17. Environment Variables

### `backend/.env`
```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/cargoflow?retryWrites=true&w=majority

# JWT
JWT_ACCESS_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxx

# Gmail (App Password — not your regular password)
GMAIL_USER=youraddress@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# CORS allowed origins
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

## 18. Running the System

```bash
# Install all dependencies (from repo root)
npm install

# Start all three servers simultaneously
npm run dev
# → backend:        http://localhost:5000
# → customer-portal: http://localhost:3000
# → owner-portal:   http://localhost:3001

# Or start individually
npm run dev:backend
npm run dev:customer
npm run dev:owner

# Run backend API tests (Jest + Supertest)
# NOTE: This is NOT how you run the server.
# This runs automated test suites only.
cd backend && npm test
```

---

## 19. Decisions Summary

| Topic | Decision | Reason |
|---|---|---|
| Primary Database | MongoDB Atlas | Document model, geospatial, flexible schema |
| Cache + Session | Upstash Redis | Fast session lookup, TTL-based caching |
| Rate Limiting | Redis INCR + EXPIRE | Stateless, works across instances |
| Job Queue | BullMQ on Redis | Async email/PDF — API never blocked |
| Real-Time | Socket.IO + Redis Pub/Sub | Push updates, scales across instances |
| Authentication | Email + Password + JWT | Professional B2B feel, no OAuth dependency |
| Password Hashing | bcrypt (12 rounds) | Industry standard, not reversible |
| Token Strategy | Access (15m memory) + Refresh (7d cookie) | Secure, invalidatable |
| Maps | Leaflet + OSM + OSRM | Free, no API key, production-quality |
| Email | Nodemailer + Gmail | Free, queue-backed, immediate delivery |
| Monorepo | Flat folders (backend/ + portals/) | Simple, no complex workspace tooling |
| Deployment (Phase 1) | Local development | Validate before cloud cost |
