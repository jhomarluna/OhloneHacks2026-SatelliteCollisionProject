import { useSimStore } from "../store/simStore";

export function ControlPanel() {
  const running = useSimStore((s) => s.running);
  const config = useSimStore((s) => s.config);
  const satellites = useSimStore((s) => s.satellites);
  const setRunning = useSimStore((s) => s.setRunning);
  const setConfig = useSimStore((s) => s.setConfig);
  const reset = useSimStore((s) => s.reset);
  const addSimSatellites = useSimStore((s) => s.addSimSatellites);
  const forceCollision = useSimStore((s) => s.forceCollision);

  const activeSatCount = satellites.filter((s) => s.active).length;

  return (
    <section className="panel">
      <h2>Controls</h2>

      <div className="row gap">
        <button onClick={() => setRunning(!running)}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset}>Reset</button>
      </div>

      {/* Satellite count context */}
      <div className="sat-count-row">
        <span className="sat-count-label">Active Satellites</span>
        <span className="sat-count-value">{activeSatCount.toLocaleString()}</span>
      </div>

      {/* Demo actions */}
      <div className="col gap" style={{ marginTop: 6 }}>
        <button
          onClick={() => addSimSatellites(63)}
          title="Deploy ~500 satellites (simulates a Starlink batch launch)"
          className="btn-launch"
        >
          🚀 Launch Satellite Batch <span className="btn-sub">(+500 sats)</span>
        </button>
        <button
          className="btn-warn"
          onClick={forceCollision}
          title="Force a collision in the most crowded band"
        >
          💥 Force Collision
        </button>
      </div>

      <label>
        Time Scale: {config.timeScale}×
        <input
          type="range"
          min={1}
          max={50}
          value={config.timeScale}
          onChange={(e) => setConfig({ timeScale: Number(e.target.value) })}
        />
      </label>

      <label>
        Collision Threshold: {config.collisionThreshold.toFixed(2)}
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.01}
          value={config.collisionThreshold}
          onChange={(e) =>
            setConfig({ collisionThreshold: Number(e.target.value) })
          }
        />
      </label>

      <label>
        Debris Per Collision: {config.debrisPerCollision}
        <input
          type="range"
          min={5}
          max={50}
          value={config.debrisPerCollision}
          onChange={(e) =>
            setConfig({ debrisPerCollision: Number(e.target.value) })
          }
        />
      </label>

    </section>
  );
}
