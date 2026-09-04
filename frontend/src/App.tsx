import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

interface Robot {
  robot_id: string;
  robot_type: string;
  x: number;
  y: number;
  battery: number;
  status: string;
  lastSeen: number;
  sequence: number;
}

interface TrendPoint {
  time: number;
  value: number;
}

const TREND_WINDOWS = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
};

const OBSTACLES = [
  { x: 150, y: 80, width: 200, height: 60 },
  { x: 150, y: 220, width: 200, height: 60 },
  { x: 150, y: 360, width: 200, height: 60 },
  { x: 500, y: 60, width: 60, height: 400 },
  { x: 650, y: 150, width: 200, height: 50 },
  { x: 650, y: 340, width: 200, height: 50 },
];

function App() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [connected, setConnected] = useState(false);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendWindow, setTrendWindow] = useState<keyof typeof TREND_WINDOWS>('5m');
  const [search, setSearch] = useState('');
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  

  useEffect(() => {
    fetch('http://localhost:3000/robots')
      .then((res) => res.json())
      .then((data: Robot[]) => {
        setRobots(data);
        const working = data.filter(
          (r) => r.status === 'active' || r.status === 'on_mission',
        ).length;
        const value = data.length > 0 ? (working / data.length) * 100 : 0;
        setTrend([{ time: Date.now(), value }]);
      })
      .catch((err) => console.error('Failed to fetch initial robots:', err));

    const socket = io('http://localhost:3000');

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('robot:update', (updatedRobot: Robot) => {
      setRobots((prevRobots) => {
        const index = prevRobots.findIndex(
          (r) => r.robot_id === updatedRobot.robot_id,
        );

        let nextRobots: Robot[];

        if (index === -1) {
          nextRobots = [...prevRobots, updatedRobot];
        } else {
          nextRobots = [...prevRobots];
          nextRobots[index] = updatedRobot;
        }

        const working = nextRobots.filter(
          (r) => r.status === 'active' || r.status === 'on_mission',
        ).length;

        const value =
          nextRobots.length > 0
            ? (working / nextRobots.length) * 100
            : 0;

        setTrend((prevTrend) =>
          [
            ...prevTrend,
            {
              time: Date.now(),
              value,
            },
          ].slice(-500),
        );

        return nextRobots;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const isRobotAttention = (r: Robot): boolean => {
    return (
      r.battery < 20 ||
      ['blocked', 'error', 'maintenance'].includes(r.status) ||
      Date.now() - r.lastSeen > 15000
    );
  };

  const activeCount = robots.filter((r) => r.status === 'active').length;
  const missionCount = robots.filter((r) => r.status === 'on_mission').length;
  const attentionCount = robots.filter(isRobotAttention).length;

  const filteredRobots = robots.filter((robot) => {
    const matchesSearch = robot.robot_id
      .toLowerCase()
      .includes(search.toLowerCase());

    const needsAttention = isRobotAttention(robot);

    return matchesSearch && (!showAttentionOnly || needsAttention);
  });

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-titles">
          <h1>Fleet Dashboard</h1>
          <p>Real-time autonomous robot monitoring</p>
        </div>

        <div className="connection-status">
          <span
            className="status-dot"
            style={{ background: connected ? '#10b981' : '#ef4444' }}
          ></span>
          {connected ? 'Live Connected' : 'Connecting...'}
        </div>
      </header>

      <section className="stats">
        <div className="stat-card">
          <span>Total Robots</span>
          <strong>{robots.length}</strong>
        </div>

        <div className="stat-card">
          <span>Active</span>
          <strong style={{ color: '#3b82f6' }}>{activeCount}</strong>
        </div>

        <div className="stat-card">
          <span>On Mission</span>
          <strong style={{ color: '#10b981' }}>{missionCount}</strong>
        </div>

        <div className="stat-card">
          <span>Needs Attention</span>
          <strong
            style={{ color: attentionCount > 0 ? '#ef4444' : 'var(--text-main)' }}
          >
            {attentionCount}
          </strong>
        </div>
      </section>

      <section className="robot-controls">
        <input
          type="text"
          placeholder="Search robot ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          className={!showAttentionOnly ? 'active-filter' : ''}
          onClick={() => setShowAttentionOnly(false)}
        >
          All Robots
        </button>

        <button
          className={showAttentionOnly ? 'active-filter' : ''}
          onClick={() => setShowAttentionOnly(true)}
        >
          Needs Attention
        </button>
      </section>

      <section className="trend-section">
        <div className="trend-header">
          <div>
            <h2>Fleet Activity Trend</h2>
            <p>Percentage of robots active or on mission</p>
          </div>

          <div className="trend-controls">
            {(Object.keys(TREND_WINDOWS) as Array<keyof typeof TREND_WINDOWS>).map(
              (window) => (
                <button
                  key={window}
                  className={trendWindow === window ? 'selected' : ''}
                  onClick={() => setTrendWindow(window)}
                >
                  {window}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="trend-chart">
          {(() => {
  const now = Date.now();
  const cutoff = now - TREND_WINDOWS[trendWindow];

  const points = trend.filter((point) => point.time >= cutoff);

  if (points.length < 2) {
    return <div className="trend-empty">Collecting trend data...</div>;
  }

  const width = 800;
  const height = 220;
  const padding = 30;

  const minTime = points[0].time;
  const maxTime = points[points.length - 1].time;

  const getX = (time: number) =>
    padding +
    ((time - minTime) / Math.max(maxTime - minTime, 1)) *
      (width - padding * 2);

  const getY = (value: number) =>
    height -
    padding -
    (value / 100) * (height - padding * 2);

  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${getX(point.time)} ${getY(point.value)}`,
    )
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="trend-svg"
      preserveAspectRatio="none"
    >
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((value) => (
        <line
          key={value}
          x1={padding}
          x2={width - padding}
          y1={getY(value)}
          y2={getY(value)}
          className="trend-grid"
        />
      ))}

      {/* Y-axis labels */}
      {[0, 25, 50, 75, 100].map((value) => (
        <text
          key={value}
          x="5"
          y={getY(value) + 4}
          className="trend-label"
        >
          {value}%
        </text>
      ))}

      {/* Trend line */}
      <path
        d={path}
        className="trend-line"
        fill="none"
      />

      {/* Current value */}
      <text
        x={width - padding}
        y={25}
        textAnchor="end"
        className="trend-current"
      >
        {points[points.length - 1].value.toFixed(1)}%
      </text>
    </svg>
  );
})()}
          {trend.length >= 0 && null}
        </div>
      </section>

      <section className="map-section">
        <div className="map-header">
          <h2>Site Map (900m × 560m)</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Real-time Live Movement
          </span>
        </div>

        <div className="map-wrapper">
          <div className="site-map">
            {OBSTACLES.map((obs, idx) => (
              <div
                key={idx}
                className="obstacle"
                style={{
                  left: `${(obs.x / 900) * 100}%`,
                  top: `${(obs.y / 560) * 100}%`,
                  width: `${(obs.width / 900) * 100}%`,
                  height: `${(obs.height / 560) * 100}%`,
                }}
              />
            ))}

            {filteredRobots.map((robot) => {
              const needsAttention = isRobotAttention(robot);
              const isSelected = selectedRobot?.robot_id === robot.robot_id;

              return (
                <div
                  key={robot.robot_id}
                  className={`robot ${needsAttention ? 'attention' : robot.status} ${isSelected ? 'selected-robot' : ''}`}
                  style={{
                    left: `${(robot.x / 900) * 100}%`,
                    top: `${(robot.y / 560) * 100}%`,
                  }}
                  onClick={() => setSelectedRobot(robot)}
                  title={`${robot.robot_id} (${robot.robot_type}) | Battery: ${robot.battery}% | Status: ${robot.status}`}
                >
                  <span className="robot-id-tag">{robot.robot_id}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selectedRobot &&
        (() => {
          const currentRobot = robots.find(
            (robot) => robot.robot_id === selectedRobot.robot_id,
          );

          if (!currentRobot) return null;

          return (
            <section className="robot-details">
              <div className="details-header">
                <h2>Robot Details ({currentRobot.robot_id})</h2>
                <button
                  className="close-details-btn"
                  onClick={() => setSelectedRobot(null)}
                >
                  ✕
                </button>
              </div>

              <div className="details-grid">
                <div className="detail-item">
                  <span>Robot ID</span>
                  <strong>{currentRobot.robot_id}</strong>
                </div>

                <div className="detail-item">
                  <span>Type</span>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {currentRobot.robot_type}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Status</span>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {currentRobot.status}
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Battery</span>
                  <strong
                    style={{
                      color:
                        currentRobot.battery < 20
                          ? '#ef4444'
                          : currentRobot.battery < 50
                          ? '#f59e0b'
                          : '#10b981',
                    }}
                  >
                    {currentRobot.battery.toFixed(1)}%
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Position</span>
                  <strong>
                    ({currentRobot.x.toFixed(1)}, {currentRobot.y.toFixed(1)})
                  </strong>
                </div>

                <div className="detail-item">
                  <span>Last Sequence</span>
                  <strong>#{currentRobot.sequence}</strong>
                </div>
              </div>
            </section>
          );
        })()}
    </div>
  );
}

export default App;