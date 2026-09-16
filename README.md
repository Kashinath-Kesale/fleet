# 🤖 Autonomous Fleet Operations & Real-Time Telemetry System

A high-throughput, real-time fleet monitoring and telemetry streaming platform for autonomous mobile robots (AMRs) in smart warehouses.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white)](https://socket.io/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🌐 Live System URLs

- **🖥️ Operator Dashboard (Frontend):** [https://fleet-gules-seven.vercel.app/](https://fleet-gules-seven.vercel.app/)
- **⚙️ Telemetry Ingestion Service (Backend):** [https://fleet-5kvg.onrender.com/](https://fleet-5kvg.onrender.com/)

> 💡 **Note:** The backend is hosted on a free Render instance. If cold-started, the first request may take a few seconds to wake up.

---

## ⚡ What Does This System Do?

In modern automated warehouses, hundreds of autonomous mobile robots move packages around 24/7. This platform solves the challenge of **tracking, ingesting, and visualizing continuous robot telemetry at scale in real time without lagging the browser or losing packet order**.

```text
┌──────────────────────────┐
│  Robot Fleet Simulator   │ ──► Multi-agent physics & battery simulation
└────────────┬─────────────┘
             │ HTTP POST /robots/updates (sequence-stamped)
             ▼
┌──────────────────────────┐
│   NestJS Ingestion API   │ ──► Monotonic sequence validation & O(1) state map
└────────────┬─────────────┘
             │ WebSocket (Socket.IO: robot:update, fleet:sync)
             ▼
┌──────────────────────────┐
│ React Operator Dashboard │ ──► Smooth map rendering, alerts & SVG trend lines
└──────────────────────────┘
```

---

## ✨ Core Features

- 🗺️ **Real-Time Warehouse Map:** Visualizes continuous robot movement on a 900x560 grid. Robots glide smoothly with CSS transitions, bounce realistically off warehouse obstacles, and never teleport.
- 🔋 **Live Telemetry & Auto-Docking:** Tracks battery drain during missions and automatically routes robots to docking stations when battery drops below $\le 20\%$.
- 📈 **Zero-Overhead SVG Trend Chart:** Custom-built live activity graph showing the active/mission fleet fraction over time with **1m**, **5m**, and **15m** zoom windows.
- 🚨 **"Needs Attention" Engine:** Instantly flags robots experiencing low battery ($<20\%$), error states, or communication dropouts ($>15\text{s}$ stale heartbeat).
- 🔍 **Robot Inspection Drawer:** Click any robot on the map or list to inspect real-time coordinates, battery level, mission status, and packet sequence numbers.
- 🛡️ **Packet Ordering & Deduplication:** Enforces monotonic sequence numbers (`seq_id`) to deterministically drop out-of-order or duplicate packets caused by network jitter.
- 🎛️ **Live Runtime Simulator Controls:** Dynamically resize the fleet (tested 12 to 500+ robots) and tweak update frequencies directly from the UI without redeploying.

---

## 💡 Key Engineering Decisions

| Feature / Challenge | Solution & Why |
| :--- | :--- |
| **Out-of-Order Packets** | Stamped every packet with a monotonically increasing integer sequence number. If incoming `sequence <= existing.sequence`, it is dropped immediately. |
| **High Ingestion Throughput** | Maintained active fleet state in an in-memory `Map<string, RobotState>` for $O(1)$ sub-microsecond updates, avoiding heavy database disk I/O bottlenecks. |
| **Fast Recovery on Reconnect** | Used dual-channel bootstrap: fetches a fresh REST snapshot (`GET /robots`) upon reconnection, then resumes listening to live delta WebSocket events. |
| **Lightweight Charting** | Built a native SVG path generator instead of importing heavy chart libraries, reducing bundle size and keeping render cycles fast. |

---

## 📊 Load Testing & Performance Benchmarks

The system was stress-tested across varying fleet sizes and update frequencies:

| Fleet Size | Update Interval | Ingestion Throughput | Dashboard Performance |
| :---: | :---: | :---: | :--- |
| **12 Robots** | 1000 ms | 12 updates/sec | ⚡ Ultra-smooth, instant |
| **100 Robots** | 1000 ms | 100 updates/sec | ⚡ Smooth, negligible CPU usage |
| **500 Robots** | 2000 ms | 250 updates/sec | ⚡ Smooth, zero delay |
| **500 Robots** | 1000 ms | 500 updates/sec | ⚡ Smooth, responsive search & filters |
| **500 Robots** | 250 ms | **~2,000 updates/sec** | ⚠️ Backend handles easily; UI frame rate dips slightly due to high DOM update frequency |

> For full architectural details, failure recovery strategies, and 10x scale-up roadmaps, see [FINDINGS.md](./FINDINGS.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🎛️ Runtime Controls & Configuration

### 1. Environment Variables

#### Backend (`backend/.env`):
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port for NestJS backend | `3000` |
| `SIMULATOR_FLEET_SIZE` | Initial number of simulated robots | `8` |
| `SIMULATOR_UPDATE_INTERVAL` | Milliseconds between telemetry cycles | `1000` |
| `SIMULATOR_PAYLOAD_SIZE` | Size of extra dummy payload in bytes | `0` |
| `ADMIN_API_KEY` | Secret key protecting runtime config updates | `fleet-admin-secret-2026` |

#### Frontend (`frontend/.env`):
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend URL for REST and Socket.IO | `http://localhost:3000` |

---

### 2. Live Simulator Controls via API / UI

You can update simulator parameters on the fly without restarting the server:

```bash
curl -X POST https://fleet-5kvg.onrender.com/simulator/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fleet-admin-secret-2026" \
  -d '{"fleetSize": 100, "updateInterval": 1000, "payloadSize": 0}'
```

---

## 🚀 Quick Start (Local Setup)

### 📋 Prerequisites
- **Node.js**: `v18+` or `v20+`
- **npm**: `v9+`
- **Git**

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Kashinath-Kesale/fleet.git
cd fleet
```

### 2️⃣ Run the Backend
```bash
cd backend
npm install
npm run start:dev
```
Backend runs at `http://localhost:3000`.

### 3️⃣ Run the Frontend
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Dashboard opens at `http://localhost:5173`.

### 4️⃣ Run Automated Unit Tests
```bash
cd backend
npm test
```
Runs test suites validating sequence validation, stale update detection, and simulator service logic.

---

## 🔌 API & WebSocket Reference

### 📡 REST Endpoints
- `GET /robots` — Returns full snapshot of all active robots.
- `GET /robots/attention` — Returns robots requiring immediate operator attention.
- `GET /robots/:robotId` — Returns live telemetry for a specific robot.
- `POST /robots/updates` — Telemetry ingestion endpoint for simulator packets.
- `GET /simulator/config` — Returns active simulator configuration.
- `POST /simulator/config` — Updates simulator configuration (Protected by `AdminAuthGuard`).
- `POST /simulator/start` — Resumes the telemetry simulation loop.
- `POST /simulator/stop` — Pauses the telemetry simulation loop.

### ⚡ WebSocket Events (Socket.IO)
- `robot:update` — Emitted in real time when a robot's coordinates, battery, or status changes.
- `fleet:sync` — Emitted when the fleet size changes to dynamically sync client rosters.