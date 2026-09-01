# 🚛 CargoFlow — Modern Road Freight & Fleet Management Platform

CargoFlow is an enterprise-grade, full-stack logistics and fleet telematics platform designed to streamline freight booking, live GPS tracking, dynamic rate estimation, quotation management, automated GST invoicing, and fleet dispatching.

The system is composed of **two dedicated frontend portals** (Customer Portal & Fleet Owner Portal) powered by a shared **real-time Node.js + Express backend API**.

---

## 🏗️ System Architecture

```
cargflow/
├── backend/                       # REST API, WebSockets & Background 
│   ├── src/
│   │   ├── config/                # Environment schema, MongoDB & Redis 
│   │   ├── controllers/           # Auth, Fleet, Shipment, Request, 
│   │   ├── middleware/            # JWT authentication, RBAC, error handling
│   │   ├── models/                # Mongoose models (User, Customer, Truck, Driver, Shipment, etc.)
│   │   ├── queues/                # BullMQ queues & workers (Email & Document generation)
│   │   ├── routes/                # Express API route endpoints
│   │   ├── services/              # Auth, Email, Geo/Distance & State Machine services
│   │   ├── socket/                # Socket.IO rooms & real-time milestone events
│   │   └── utils/                 # Constants, ApiResponse, ApiError helpers
│   ├── tests/                     # Jest + Supertest API integration test suite
│   └── index.js                   # Server bootstrap & process lifecycle
├── customer-portal/               # React + Vite Customer Web App (Port 3000)
│   ├── src/
│   │   ├── components/            # Layout, UI components, Leaflet RouteMap
│   │   ├── pages/                 # Landing, Auth, Dashboard, RequestShipment, Tracking, Payments
│   │   ├── services/              # Axios API client, Socket.IO subscriber, Dynamic Geo Service
│   │   └── store/                 # Zustand authentication & toast notification stores
└── owner-portal/                  # React + Vite Fleet Owner Web App (Port 3001)
    ├── src/
    │   ├── components/            # Layout, UI components, RouteMap, Modals
    │   ├── pages/                 # Auth, Dashboard, Trucks, Drivers, Shipments, Reports, 
    │   ├── services/              # Axios API client & Socket.IO emitter/subscriber
    │   └── store/                 # Zustand authentication & toast notification stores
```

---

## 💻 Tech Stack

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) (v18+ recommended)
- **Framework:** [Express.js](https://expressjs.com/) (RESTful routing, CORS, cookie parsing)
- **Database & ORM:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) (Schema modeling, indexing, aggregation pipelines)
- **Caching & Message Broker:** [Upstash Redis](https://upstash.com/) via `ioredis` (with automatic in-memory fallback for local dev)
- **Job Queues & Workers:** [BullMQ](https://docs.bullmq.io/) (Asynchronous email dispatch & invoice generation)
- **Real-Time Communication:** [Socket.IO](https://socket.io/) (Bi-directional real-time GPS tracking & shipment status push)
- **Authentication & Security:** JSON Web Tokens (Access + Refresh Tokens in httpOnly cookies), [BcryptJS](https://www.npmjs.com/package/bcryptjs)
- **Validation:** [Zod](https://zod.dev/) (Strict type validation for API request bodies)
- **Email Service:** [Nodemailer](https://nodemailer.com/) (Google SMTP integration with dev console fallback)

### Frontend (Customer & Fleet Owner Portals)
- **Core:** [React 18](https://react.dev/) & [Vite 5](https://vitejs.dev/) (Lightning-fast HMR and optimized bundler)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Lightweight, persistent auth and UI state)
- **Routing:** [React Router 6](https://reactrouter.com/) (Protected routes, history navigation)
- **HTTP Client:** [Axios](https://axios-http.com/) (Request/response interceptors for automatic JWT authorization)
- **Maps & Telematics:** [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) (Interactive highway routes and truck GPS beacons)
- **Geocoding & Routing API:** OpenStreetMap Nominatim, Open-Meteo Geocoding, and Project OSRM (100% free dynamic road distance & duration calculation)

---

## 📋 Prerequisites

Before running the application, ensure you have the following installed and available:

1. **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
2. **npm**: `v9.0.0` or higher (comes bundled with Node.js)
3. **MongoDB Connection** *(Required)*:
   - A free **MongoDB Atlas** cluster connection string (e.g., `mongodb+srv://...`), or a local MongoDB instance (`mongodb://localhost:27017/cargoflow`).
4. **Upstash Redis** *(Optional)*:
   - Upstash REST URL & Token for cloud caching/queues. If omitted, CargoFlow automatically uses a built-in in-memory store.
5. **Gmail App Password** *(Optional)*:
   - A 16-character Google App Password for transactional emails. If omitted, emails are gracefully logged to the terminal console.

---

## 🔌 Required Connections & Ports

| Service | Port / Protocol | URL / Endpoint | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` (HTTP) | `http://localhost:5000` | REST API endpoints & Health Check (`/api/health`) |
| **WebSockets** | `5000` (WS/WSS) | `ws://localhost:5000` | Real-time GPS telematics & event streaming |
| **Customer Portal** | `3000` (HTTP) | `http://localhost:3000` | Shipper web app: requests, quotations, public tracking |
| **Fleet Owner Portal**| `3001` (HTTP) | `http://localhost:3001` | Fleet operations: trucks, drivers, dispatch, reports |
| **MongoDB Database**| `27017` / TLS | `mongodb+srv://...` | Persistent data store for users, fleet, shipments |
| **Upstash Redis** | `6379` / TLS | `https://*.upstash.io` | Distributed caching, rate limits, BullMQ queues |

---

## ⚙️ Environment Variables Setup

Create `.env` files in each sub-package using the template below:

### 1. Backend (`backend/.env`)
```env
NODE_ENV=development
PORT=5000

# MongoDB Database Connection
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cargoflow

# JWT Secret Keys (replace with your secure strings)
JWT_ACCESS_SECRET=cargoflow-dev-access-secret-key-32chars
JWT_REFRESH_SECRET=cargoflow-dev-refresh-secret-key-32chars
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Upstash Redis (Optional - leave blank for in-memory fallback)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# Gmail SMTP (Optional - use 16-char App Password, or leave blank for console logging)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

### 3. Fleet Owner Portal (`owner-portal/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 How to Build and Run the Application

### Method 1: Running in Separate Terminals (Recommended for Development)

Open 3 terminal windows to run all three services concurrently:

#### Terminal 1 — Start Backend Server:
```bash
cd backend
npm install
npm run dev
# Or run with node directly:
# node index.js
```
*Backend will be running at `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)*

#### Terminal 2 — Start Customer Portal:
```bash
cd customer-portal
npm install
npm run dev
```
*Customer Portal will be running at `http://localhost:3000`*

#### Terminal 3 — Start Fleet Owner Portal:
```bash
cd owner-portal
npm install
npm run dev
```
*Fleet Owner Portal will be running at `http://localhost:3001`*

---

### Method 2: Production Build

To build optimized production assets for both frontend applications:

```bash
# Build Customer Portal
cd customer-portal
npm run build

# Build Fleet Owner Portal
cd ../owner-portal
npm run build
```

The compiled static assets will be output to `customer-portal/dist` and `owner-portal/dist`.

---

## 🧪 Testing & Database Seeding

- **Run Backend Integration Tests:**
  ```bash
  cd backend
  npm test
  ```
- **Seed Initial Fleet & User Data:**
  ```bash
  cd backend
  npm run seed
  ```

---

## 👥 User Roles & Workflow

1. **CUSTOMER (`http://localhost:3000`)**:
   - Request freight shipments with live highway distance calculation.
   - Review and accept competitive quotations from fleet owners.
   - Track cargo in real time on interactive Leaflet maps.
   - Download GST invoices and view digital proof-of-delivery (e-POD).

2. **FLEET OWNER (`http://localhost:3001`)**:
   - Register trucks (`light`, `medium`, `heavy`, `container`, etc.) and onboard drivers.
   - Review incoming shipment requests and issue itemized quotations with GST.
   - Assign trucks and drivers to confirmed bookings.
   - Push real-time GPS telemetry updates and view financial analytics/reports.

3. **PUBLIC TRACKING (`http://localhost:3000/public/:ref`)**:
   - Anyone with a tracking reference (e.g. `CF-22045`) can track a shipment on the public map without logging in.

---

## 📄 License & Notes

- **License:** Proprietary / Private
- **Security Notice:** For production deployments, ensure all secrets in `.env` are cryptographically secure, enforce HTTPS/TLS across all endpoints, and whitelist your server's IP in MongoDB Atlas.
