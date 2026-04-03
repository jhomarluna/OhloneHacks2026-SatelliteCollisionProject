import { useState } from "react";
import { useSimStore } from "../store/simStore";
import { fetchRealSatelliteData, realDataToState } from "../data/celestrak";

export function ControlPanel() {
  const running = useSimStore((s) => s.running);
  const config = useSimStore((s) => s.config);
  const realDataTotal = useSimStore((s) => s.realDataTotal);
  const setRunning = useSimStore((s) => s.setRunning);
  const setConfig = useSimStore((s) => s.setConfig);
  const reset = useSimStore((s) => s.reset);
  const loadRealData = useSimStore((s) => s.loadRealData);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function handleLoadRealData() {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchRealSatelliteData();
      const state = realDataToState(data, config);
      loadRealData({ ...state, realDataTotal: data.totalTracked });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <h2>Controls</h2>
      <div className="row gap">
        <button onClick={() => setRunning(!running)}>
          {running ? "Pause" : "Start"}
        </button>
        <button onClick={reset}>Reset</button>
      </div>

      <button
        className="real-data-btn"
        onClick={handleLoadRealData}
        disabled={loading}
        style={{ marginTop: 12 }}
      >
        {loading ? "Fetching satellites..." : "Load Real Satellite Data"}
      </button>
      {realDataTotal != null && (
        <p className="real-data-badge">
          {realDataTotal.toLocaleString()} tracked objects worldwide
        </p>
      )}
      {loadError && <p style={{ color: "#ef4444", fontSize: 13 }}>{loadError}</p>}

      <label>
        Time Scale: {config.timeScale}
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
      <label>
        Launch Rate: {config.launchRate} sat/tick
        <input
          type="range"
          min={0}
          max={10}
          value={config.launchRate}
          onChange={(e) =>
            setConfig({ launchRate: Number(e.target.value) })
          }
        />
      </label>
    </section>
  );
}
