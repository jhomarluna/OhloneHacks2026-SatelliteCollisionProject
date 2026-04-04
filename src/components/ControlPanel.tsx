import { useSimStore } from "../store/simStore";

export function ControlPanel() {
  const running = useSimStore((s) => s.running);
  const config = useSimStore((s) => s.config);
  const setRunning = useSimStore((s) => s.setRunning);
  const setConfig = useSimStore((s) => s.setConfig);
  const reset = useSimStore((s) => s.reset);
  const addSimSatellites = useSimStore((s) => s.addSimSatellites);
  const forceCollision = useSimStore((s) => s.forceCollision);

  return (
    <section className="panel">
      <h2>Controls</h2>

      <div className="row gap">
        <button onClick={() => setRunning(!running)}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset}>Reset</button>
      </div>

      {/* Demo actions */}
      <div className="row gap" style={{ marginTop: 10 }}>
        <button
          onClick={() => addSimSatellites(25)}
          title="Add 25 satellites per orbital band to increase collision risk"
        >
          + Add 25 Satellites
        </button>
        <button
          className="btn-warn"
          onClick={forceCollision}
          title="Force a collision in the most crowded band"
        >
          Force Collision
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
