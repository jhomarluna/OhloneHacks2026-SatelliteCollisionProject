import type { SimMetrics, SimStatus } from "../types/sim";
  export function StatsPanel({ metrics, status }: { metrics: SimMetrics; status:
  SimStatus }) {
    return (
      <section className="panel">
        <h2>Stats</h2>
        <p>Status: {status}</p>
        <p>Time: {metrics.time}</p>
        <p>Active Satellites: {metrics.activeSatellites}</p>
        <p>Debris Count: {metrics.debrisCount}</p>
        <p>Total Collisions: {metrics.collisions}</p>
        <p>Unusable Bands: {metrics.unusableBands}</p>
      </section>
    );
}