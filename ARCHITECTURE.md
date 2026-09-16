# 🏛️ System Architecture & Data Flow

This document details the internal architecture, end-to-end data pipeline, fault-tolerance mechanisms, and scalability design for the **Autonomous Fleet Operations & Telemetry System**.

---

## 📐 1. High-Level Architecture

The system is composed of three decoupled layers:

```text
┌────────────────────────────────────────────────────────┐
│               1. Multi-Agent Simulator                 │
│  - Continuous velocity vector physics (vx, vy)         │
│  - Warehouse obstacle collision bounce math            │
│  - Autonomous battery depletion & docking state machine│
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP POST /robots/updates (sequence stamped)
                           ▼
┌────────────────────────────────────────────────────────┐
│                 2. Ingestion Backend                   │
│  - ValidationPipe & DTO contract enforcement           │
│  - Monotonic sequence ordering (drops stale packets)   │
│  - O(1) In-Memory Fleet State Map                      │
│  - Socket.IO Realtime Gateway for fanout broadcasts    │
└──────────────────────────┬─────────────────────────────┘
                           │ WebSocket Events (robot:update, fleet:sync)
                           ▼
┌────────────────────────────────────────────────────────┐
│             3. React Operator Dashboard                │
│  - Smooth interpolated coordinate map rendering        │
│  - Attention Engine (flags <20% battery, >15s stale)   │
│  - Custom SVG activity trend projection over time      │
│  - Inspection drawer for live deep telemetry           │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 2. End-to-End Live Packet Journey

Every coordinate update follows a strict 6-step lifecycle from generation to screen:

1. **⏱️ Telemetry Generation:**  
   Every tick (e.g., `1000ms`), the simulator computes the new position $(x, y)$ of each robot using continuous velocity vectors $(v_x, v_y)$, checks boundary/rack collisions, drains battery, and increments its monotonic `sequence` counter.

2. **📤 HTTP Ingestion (`POST /robots/updates`):**  
   The simulator transmits the JSON packet to the NestJS ingestion endpoint.

3. **🛡️ Sequence & Deduplication Validation:**  
   In `RobotsService.updateRobot()`, the backend compares the incoming `sequence` with the existing state:
   ```typescript
   if (existing && incomingDto.sequence <= existing.sequence) {
     return existing; // Deterministically drop stale, delayed, or duplicate packet
   }
   ```

4. **⚡ Sub-Millisecond $O(1)$ State Update:**  
   If the packet is valid, the in-memory `Map<string, RobotState>` is updated instantly and `lastSeen` timestamp is refreshed.

5. **📡 WebSocket Fanout (`Socket.IO`):**  
   The `RealtimeGateway` emits a `robot:update` event to all connected dashboard clients.

6. **🖥️ Smooth Browser UI Render:**  
   React receives the delta update. Percentage-based CSS interpolation smoothly moves the robot indicator on the warehouse map without re-fetching full snapshots.

---

## 🛡️ 3. Fault Tolerance & Failure Handling

| Failure Scenario | How the System Responds |
| :--- | :--- |
| **📶 Packet Delay & Wi-Fi Jitter** | Monotonic sequence validation guarantees delayed packets arriving out of order are dropped immediately, preventing robots from jumping backwards on screen. |
| **🔌 Robot Disconnection** | Telemetry ingestion stamps each update with a timestamp (`lastSeen`). An attention filter scans for robots with no pings for $>15\text{s}$ and flags them as disconnected. |
| **🔄 Dashboard Network Interruption** | Socket.IO auto-reconnects with exponential backoff. Upon reconnection, the dashboard triggers a dual-channel sync (`GET /robots` snapshot fetch) before resuming live delta event listening. |
| **💥 Server Restart / Cold Start** | The in-memory state engine is self-healing: as soon as the simulator starts sending telemetry, all robots auto-register and restore full fleet state within 1 second. |

---

## 🚀 4. Scaling Strategy: 500 $\rightarrow$ 5,000+ Robots

Under load testing with **500 robots at 250ms interval (~2,000 updates/sec)**, the NestJS backend handled the load effortlessly due to $O(1)$ in-memory lookups. The primary client-side bottleneck was browser DOM reflow overhead.

To scale the architecture to **5,000+ robots (20,000+ updates/sec)**:

```text
[5,000 Robots] ──► [MQTT Broker / Kafka Cluster] ──► [NestJS Ingestion Workers]
                                                              │
                                                              ▼
                                                     [Redis In-Memory State]
                                                              │
                                                     [Redis Pub/Sub Adapter]
                                                              │
                                                              ▼
                                                   [Socket.IO Gateway Cluster]
                                                              │
                                                              ▼
                                              [HTML5 Canvas / WebGL Frontend]
```

1. **🎨 GPU Canvas/WebGL Rendering:** Replace individual DOM elements with an HTML5 `<canvas>` or WebGL renderer (Pixi.js) to render 5,000+ dots with GPU instancing.
2. **📦 Frame-Rate Batching:** Coalesce high-frequency updates in memory on the frontend and flush to the UI once per screen refresh (60 FPS / 16ms) using `requestAnimationFrame`.
3. **📨 Message Broker Buffering:** Place an **MQTT broker (EMQX)** or **Kafka** in front of ingestion to buffer high-throughput bursts.
4. **🌐 Horizontal Backend Scaling:** Use **Redis Pub/Sub** with `@socket.io/redis-adapter` to distribute WebSocket connections across multiple backend nodes.