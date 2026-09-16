# 📊 Performance Benchmarks & Engineering Findings

This document outlines key technical trade-offs, load testing observations, bottleneck analysis, and future scalability milestones for the **Autonomous Fleet Operations & Telemetry System**.

---

## 💡 1. Key Architectural Decisions

- **🌐 HTTP POST for Telemetry Ingestion:**  
  Decouples the simulator and ingestion pipeline with clean REST boundaries, making the ingestion API easily mockable, benchmarkable, and testable with standard load tools.
- **⚡ WebSocket (Socket.IO) for Client Broadcasts:**  
  Eliminates client-side polling overhead. Telemetry deltas are pushed instantly to connected operator dashboards over persistent TCP connections.
- **🧠 Zero-I/O In-Memory State Engine:**  
  Maintains active fleet state in an $O(1)$ memory map (`Map<string, RobotState>`), enabling sub-microsecond state reads and writes without hitting database connection pool or disk I/O limits.
- **🎛️ Dynamic Runtime Reconfiguration:**  
  Fleet size, update interval, and payload size are adjustable at runtime through protected admin APIs without restarting or redeploying containers.

---

## 📈 2. Load Testing & Stress Observations

The deployed system was benchmarked across **12, 50, 100, 300, and 500 simulated robots** under varying telemetry intervals:

| Fleet Size | Update Interval | Ingestion Rate | Dashboard Latency | System State |
| :---: | :---: | :---: | :---: | :--- |
| **12 Robots** | 1000 ms | 12 req/sec | $< 5\text{ms}$ | 🟢 Ultra-smooth, instant |
| **100 Robots** | 1000 ms | 100 req/sec | $< 10\text{ms}$ | 🟢 Smooth, negligible resource usage |
| **500 Robots** | 2000 ms | 250 req/sec | $< 20\text{ms}$ | 🟢 Perfectly smooth, instant search & filters |
| **500 Robots** | 1000 ms | 500 req/sec | $\sim 50\text{ms}$ | 🟢 Smooth, responsive UI interactions |
| **500 Robots** | 500 ms | 1,000 req/sec | $\sim 150\text{ms}$ | 🟡 Micro-delay when searching or opening drawer |
| **500 Robots** | 250 ms | **~2,000 req/sec** | $\sim 350\text{ms}$ | 🟠 Backend runs easily; browser DOM frame rate dips to ~30 FPS |

---

## 🔍 3. Bottleneck Analysis

### 🖥️ Frontend vs. Backend Degradation
During stress testing up to **2,000 updates/sec**:
- **Backend Performance:** The NestJS in-memory ingestion engine consumed minimal CPU/RAM and processed incoming updates with sub-millisecond latency.
- **Frontend UI Thread:** The first noticeable degradation occurred on the **browser rendering layer**. Because React diffed and re-rendered individual DOM elements for 500 moving robot dots at high frequencies, the browser main thread experienced frame drops.

---

## ⚖️ 4. Architectural Trade-offs

To optimize for maximum real-time streaming throughput and zero-latency UI responsiveness:
1. **In-Memory vs. Database Persistence:** Prioritized sub-microsecond in-memory updates over synchronous database writes. In a full production rollout, cold analytics would be asynchronously offloaded to a time-series store (TimescaleDB / ClickHouse).
2. **Native SVG vs. Heavy Chart Libraries:** Chose a lightweight native SVG path projection for the fleet activity trend line, saving ~150KB in bundle size and eliminating external charting render lag.

---

## 🚀 5. Scaling Roadmap (10x Growth)

To scale beyond 5,000+ robots:
1. **🎨 GPU Canvas Rendering:** Migrate from DOM/SVG nodes to HTML5 Canvas or WebGL (Pixi.js).
2. **⏱️ Display Frame Throttling:** Buffer incoming WebSocket packets in an in-memory queue and apply updates using `requestAnimationFrame` at a fixed 60 FPS.
3. **📨 Message Broker Ingestion:** Introduce **MQTT (EMQX)** or **Apache Kafka** to buffer high-velocity bursts from physical robots.
4. **🌐 Distributed Cluster:** Deploy multiple NestJS instances with **Redis Pub/Sub** and `@socket.io/redis-adapter` behind an NGINX load balancer.