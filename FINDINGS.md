# Findings

## 1. Design Choices

- **HTTP** is used for simulator → backend telemetry ingestion. It keeps the producer/consumer boundary simple and easy to test for this challenge.
- **WebSocket (Socket.IO)** is used for backend → dashboard live updates, avoiding repeated polling of the entire fleet.
- The backend maintains the **latest fleet state in memory**. Persistent history was not implemented because it is an optional stretch goal.
- Fleet size, update interval, and payload size are configurable. Fleet size and update interval can also be changed on the deployed instance without redeployment.

## 2. Load Testing

I tested the deployed system with **12, 50, 100, 300, and 500 robots**.

| Fleet | Update Interval | Result |
|---|---:|---|
| 500 | 2000 ms | Smooth |
| 500 | 1000 ms | Slight delay after several seconds |
| 500 | 500 ms | More noticeable delay |
| 500 | 250 ms | Further increase in delay |

At 500 robots / 2000 ms, the dashboard remained smooth and responsive.

## 3. Observed Bottleneck

The first noticeable degradation was on the **frontend rendering/update path** rather than an immediate backend failure.

At higher update frequencies, the browser has to process and render substantially more robot updates. The system remained usable during all of the tested configurations, but the delay increased as the update frequency increased.

## 4. What I Cut

I did not implement the optional persistent fleet history or:

`GET /robots/history/{robot_id}`

I prioritized the required simulator, backend ingestion, live dashboard, runtime controls, filtering/search, trend visualization, and deployment.

## 5. What I Would Build Next

If the fleet grew significantly, I would first:

1. Batch/coalesce frequent updates before rendering.
2. Optimize map rendering for hundreds/thousands of robots.
3. Introduce a message broker to buffer and decouple ingestion.
4. Horizontally scale backend consumers with shared state/pub-sub.
5. Add persistent history for long-term analysis.