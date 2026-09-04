# Fleet Management Dashboard

A real-time fleet monitoring and telemetry system built for the Peppermint Robotics SDE-1 Full Stack Hiring Challenge.

The system simulates autonomous mobile robots moving across a warehouse site, ingests telemetry through a NestJS backend, and renders live positions, statuses, telemetry details, and activity trends on an operator dashboard in the browser.

---

## Live System URLs

- **Live Dashboard (Frontend):** [https://fleet-gules-seven.vercel.app/](https://fleet-gules-seven.vercel.app/)
- **Live Backend Service:** [https://fleet-5kvg.onrender.com/](https://fleet-5kvg.onrender.com/)

*Note: The backend is hosted on a free Render tier. If cold-started, the first request may take a few seconds to wake up.*

---

## Key Features

- **Real-Time Warehouse Map**: Visualizes robots moving continuously along valid paths on the 900x560 site, avoiding warehouse obstacle zones without teleporting.
- **Dynamic Telemetry**: Live status transitions (`idle`, `active`, `on_mission`, `charging`), battery discharge during activity, and auto-recharging when battery drops $\le 20\%$.
- **Activity Trend Over Time**: Real-time connected SVG trend line showing active/mission fleet fraction with zoomable time windows (**1m**, **5m**, **15m**).
- **Search & Needs Attention Filtering**: Exact robot ID search (`r1`, `r2`) and an operational "Needs Attention" filter detecting low battery ($<20\%$), error/blocked states, or stale telemetry ($>15\text{s}$).
- **Robot Inspection Drawer**: Click any robot on the map or list to inspect real-time coordinates, battery level, type, status, and packet sequence numbers.
- **Robust Ingestion Pipeline**: Ingests updates via `POST /robots/updates`, enforces out-of-order rejection via sequence checking, and broadcasts live state via Socket.IO.
- **Runtime Simulator Controls**: Adjust fleet size, update interval, and payload size live from the dashboard or API without redeploying.

---

## Architecture & Data Flow

```text
┌──────────────────────────┐
│ Robot Telemetry Simulator │
└────────────┬─────────────┘
             │ HTTP POST /robots/updates (sequence-stamped)
             ▼
┌──────────────────────────┐
│      NestJS Backend      │ ◄── REST API (GET /robots, GET /simulator/config)
│  (O(1) In-Memory State)  │
└────────────┬─────────────┘
             │ WebSocket (Socket.IO: robot:update, fleet:sync)
             ▼
┌──────────────────────────┐
│  React Operator Dashboard│
└──────────────────────────┘
```

For full details on data flow, fault tolerance (stale detection, out-of-order sequence rejection, reconnects), and 10x scale strategy, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Configuration Knobs & Live Controls

### 1. Environment Variables (Configuration without code changes)

#### Backend (`backend/.env`):
| Variable | Description | Default / Value |
| :--- | :--- | :--- |
| `PORT` | Port for NestJS backend | `3000` |
| `SIMULATOR_FLEET_SIZE` | Initial simulated robot count | `8` |
| `SIMULATOR_UPDATE_INTERVAL` | Milliseconds between simulator cycles | `1000` |
| `SIMULATOR_PAYLOAD_SIZE` | Size of extra dummy payload in bytes | `0` |
| `ADMIN_API_KEY` | Secret token protecting runtime config changes | Required |

#### Frontend (`frontend/.env`):
| Variable | Description | Default / Value |
| :--- | :--- | :--- |
| `VITE_API_URL` | Target backend URL for REST and WebSocket | `http://localhost:3000` |

---

### 2. Live Runtime Controls (Adjustable without redeploy)

The deployed dashboard includes a **Simulator Controls** panel at the bottom right.

- **Admin Key Authentication**: Enter the configured admin key in the Admin Key input.
- **Fleet Size**: Increase/decrease fleet size (tested up to 500 robots). The backend dynamically adds or prunes simulated robots and syncs the dashboard via `fleet:sync`.
- **Update Interval**: Adjust telemetry frequency in milliseconds (e.g., `2000`, `1000`, `500`, `250`).
- **Payload Size**: Add payload data (bytes) to test high-throughput bandwidth consumption.
- **Apply Changes**: Click **"Apply Configuration"** to push updates to `POST /simulator/config` with the `Authorization: Bearer <token>` header.

You can also adjust parameters directly via cURL:
```bash
curl -X POST https://fleet-5kvg.onrender.com/simulator/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  -d '{"fleetSize": 100, "updateInterval": 1000, "payloadSize": 0}'
```

---

## Local Setup & Run Steps

### Linux / macOS / Windows

#### Prerequisites
- **Node.js**: v18.x or v20.x+
- **npm**: v9.x+
- **Git**

#### 1. Clone the repository
```bash
git clone https://github.com/Kashinath-Kesale/fleet.git
cd fleet
```

#### 2. Run the Backend
```bash
cd backend
npm install
npm run start:dev
```
The backend starts at `http://localhost:3000`.

#### 3. Run the Frontend Dashboard
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
The dashboard opens at `http://localhost:5173`.

#### 4. Run Automated Tests
```bash
cd backend
npm test
```
Runs backend unit tests, including stale/out-of-order update rejection and module initialization.

#### 5. Build for Production
```bash
# Backend build
cd backend
npm run build

# Frontend build
cd frontend
npm run build
```

---

## REST & Real-Time API Reference

### Robot Telemetry
- `GET /robots`: Returns the current fleet snapshot.
- `GET /robots/attention`: Returns robots with low battery, error statuses, or stale heartbeats.
- `GET /robots/:robotId`: Returns state for a specific robot.
- `POST /robots/updates`: Telemetry ingestion endpoint for simulator updates.

### Simulator Control
- `GET /simulator/config`: Read active simulator configuration.
- `POST /simulator/config`: Protected configuration update endpoint (`AdminAuthGuard`).
- `POST /simulator/start`: Start the simulation loop.
- `POST /simulator/stop`: Pause the simulation loop.

### WebSocket Events (Socket.IO)
- `robot:update`: Emitted when an individual robot's position, battery, or status updates.
- `fleet:sync`: Emitted when the fleet roster is resized or re-synchronized.

---

## Performance & Load Testing

The system was tested under heavy load:
- **Fleet sizes**: 12, 50, 100, 300, 500 robots.
- **Update intervals**: 2000ms down to 250ms (~2,000 updates/sec).
- **Result**: Each robot update uses $O(1)$ state lookup/update, while total in-memory state is $O(N)$ with respect to fleet size. At extreme update frequencies (250ms @ 500 robots), frontend rendering/update processing becomes the first noticeable bottleneck.

Detailed findings, tradeoffs, and scale-up plans are documented in [FINDINGS.md](./FINDINGS.md).

---

## AI Usage & Delegation Notes

In compliance with the challenge requirements:
- **AI Tooling Used**: ChatGPT / Antigravity AI assistant.
- **Delegated Tasks**:
  - Boilerplate generation for NestJS modules and DTO validation pipes.
  - Trigonometric bounce vector logic for warehouse obstacle collision in the simulator.
  - SVG path generator for the trend line chart and responsive CSS styling.
  - Reviewing unit test mock setups and drafting markdown documentation structure.
- **Human Ownership**: System architecture design, state synchronization logic, sequence number validation, stale timeout mechanics, live testing, configuration parameter tuning, and deployment.