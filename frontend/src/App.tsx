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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function App() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [connected, setConnected] = useState(false);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendWindow, setTrendWindow] = useState<keyof typeof TREND_WINDOWS>('5m');
  const [search, setSearch] = useState('');
  const [showAttentionOnly, setShowAttentionOnly] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);

  const [configFleetSize, setConfigFleetSize] = useState<number>(12);
  const [configInterval, setConfigInterval] = useState<number>(2000);
  const [configPayloadSize, setConfigPayloadSize] = useState<number>(0);
  const [adminKey, setAdminKey] = useState<string>(
    () => sessionStorage.getItem('fleet_admin_key') || '',
  );
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSavedMsg, setConfigSavedMsg] = useState('');
  const [configErrorMsg, setConfigErrorMsg] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/robots`)
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

    fetch(`${API_URL}/simulator/config`)
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg.fleetSize !== undefined) setConfigFleetSize(cfg.fleetSize);
        if (cfg.updateInterval !== undefined) setConfigInterval(cfg.updateInterval);
        if (cfg.payloadSize !== undefined) setConfigPayloadSize(cfg.payloadSize);
      })
      .catch((err) => console.error('Failed to fetch simulator config:', err));

    const socket = io(API_URL);

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('fleet:sync', (activeRobots: Robot[]) => {
      setRobots(activeRobots);
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
    const q = search.trim().toLowerCase();
    const id = robot.robot_id.toLowerCase();

    let matchesSearch = true;
    if (q) {
      if (id === q || id === `r${q}`) {
        matchesSearch = true;
      } else if (q === 'r') {
        matchesSearch = true;
      } else {
        matchesSearch = false;
      }
    }

    const needsAttention = isRobotAttention(robot);

    return matchesSearch && (!showAttentionOnly || needsAttention);
  });

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    setConfigSavedMsg('');
    setConfigErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/simulator/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminKey}`,
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({
          fleetSize: configFleetSize,
          updateInterval: configInterval,
          payloadSize: configPayloadSize,
        }),
      });
      if (res.ok) {
        sessionStorage.setItem('fleet_admin_key', adminKey);
        setConfigSavedMsg('Config applied!');
        setTimeout(() => setConfigSavedMsg(''), 3000);
        const robotsRes = await fetch(`${API_URL}/robots`);
        const updatedRobots = await robotsRes.json();
        setRobots(updatedRobots);
      } else if (res.status === 401) {
        setConfigErrorMsg('Unauthorized: Invalid Admin Key');
      } else {
        setConfigErrorMsg(`Failed: ${res.statusText}`);
      }
    } catch (err) {
      console.error('Failed to update simulator config:', err);
      setConfigErrorMsg('Network connection error');
    } finally {
      setIsSavingConfig(false);
    }
  };

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

      {/* Main 2-Column Grid: Map on Left, Control/Details/Trend on Right */}
      <div className="dashboard-grid">
        {/* Left Column: Warehouse Map */}
        <section className="map-section">
          <div className="map-header">
            <div>
              <h2>Warehouse Site Map</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                900m × 560m Live Operational View
              </p>
            </div>
            <span className="live-badge">Live Moving</span>
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

        {/* Right Column: Search, Robot Details, and Activity Trend */}
        <div className="sidebar-column">
          {/* 1. Search & Filter Card */}
          <section className="sidebar-card">
            <div className="sidebar-card-header">
              <h3>Search & Filter</h3>
            </div>
            <div className="sidebar-controls">
              <input
                type="text"
                placeholder="Search robot ID (e.g. r1)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="sidebar-filter-buttons">
                <button
                  className={!showAttentionOnly ? 'active-filter' : ''}
                  onClick={() => setShowAttentionOnly(false)}
                >
                  All ({robots.length})
                </button>
                <button
                  className={showAttentionOnly ? 'active-filter' : ''}
                  onClick={() => setShowAttentionOnly(true)}
                >
                  Attention ({attentionCount})
                </button>
              </div>
            </div>
          </section>

          {/* 2. Selected Robot Details Card */}
          <section className="sidebar-card">
            <div className="sidebar-card-header">
              <h3>
                {selectedRobot
                  ? `Robot Details (${selectedRobot.robot_id})`
                  : 'Robot Details'}
              </h3>
              {selectedRobot && (
                <button
                  className="close-details-btn"
                  onClick={() => setSelectedRobot(null)}
                >
                  ✕
                </button>
              )}
            </div>

            {selectedRobot ? (
              (() => {
                const currentRobot = robots.find(
                  (robot) => robot.robot_id === selectedRobot.robot_id,
                );

                if (!currentRobot) return null;

                return (
                  <div className="sidebar-details-grid">
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
                      <span>Sequence</span>
                      <strong>#{currentRobot.sequence}</strong>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="sidebar-placeholder">
                <span>Click any robot on the map to inspect live telemetry</span>
              </div>
            )}
          </section>

          {/* 3. Trend Chart Card */}
          <section className="sidebar-card">
            <div className="sidebar-card-header">
              <div>
                <h3>Fleet Trend</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                  Active or on mission %
                </p>
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

            <div className="trend-chart-compact">
              {(() => {
                const now = Date.now();
                const cutoff = now - TREND_WINDOWS[trendWindow];

                const points = trend.filter((point) => point.time >= cutoff);

                if (points.length < 2) {
                  return <div className="trend-empty">Collecting trend data...</div>;
                }

                const width = 400;
                const height = 130;
                const padding = 24;

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
                    {[0, 50, 100].map((value) => (
                      <line
                        key={value}
                        x1={padding}
                        x2={width - padding}
                        y1={getY(value)}
                        y2={getY(value)}
                        className="trend-grid"
                      />
                    ))}

                    {[0, 50, 100].map((value) => (
                      <text
                        key={value}
                        x="2"
                        y={getY(value) + 4}
                        className="trend-label"
                      >
                        {value}%
                      </text>
                    ))}

                    <path
                      d={path}
                      className="trend-line"
                      fill="none"
                    />

                    <text
                      x={width - padding}
                      y={18}
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

          {/* 4. Simulator Controls Card */}
          <section className="sidebar-card">
            <div className="sidebar-card-header">
              <h3>Simulator Controls</h3>
              {configSavedMsg && (
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  {configSavedMsg}
                </span>
              )}
              {configErrorMsg && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                  {configErrorMsg}
                </span>
              )}
            </div>

            <div className="sim-controls-form">
              <div className="sim-control-row">
                <span>Fleet Size</span>
                <div className="counter-controls">
                  <button
                    type="button"
                    onClick={() =>
                      setConfigFleetSize((prev) => Math.max(1, prev - 1))
                    }
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={configFleetSize}
                    onChange={(e) =>
                      setConfigFleetSize(Math.max(1, Number(e.target.value)))
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setConfigFleetSize((prev) => prev + 1)
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="sim-control-row">
                <span>Interval (ms)</span>
                <input
                  type="number"
                  min="500"
                  max="10000"
                  step="500"
                  value={configInterval}
                  onChange={(e) => setConfigInterval(Number(e.target.value))}
                />
              </div>

              <div className="sim-control-row">
                <span>Payload (bytes)</span>
                <input
                  type="number"
                  min="0"
                  max="65536"
                  step="64"
                  value={configPayloadSize}
                  onChange={(e) => setConfigPayloadSize(Number(e.target.value))}
                />
              </div>

              <div className="sim-control-row">
                <span>Admin Key</span>
                <input
                  type="password"
                  placeholder="Enter admin key..."
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  style={{ width: '140px' }}
                />
              </div>

              <button
                className="apply-config-btn"
                disabled={isSavingConfig}
                onClick={handleSaveConfig}
              >
                {isSavingConfig ? 'Applying...' : 'Apply Config'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;