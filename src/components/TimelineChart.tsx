import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { TimelinePoint } from "../types/sim";

export function TimelineChart({ history }: { history: TimelinePoint[] }) {
  const latest = history[history.length - 1];
  const peakDebris = Math.max(...history.map((h) => h.debrisCount), 1);

  return (
    <section className="panel chart-panel">
      <h2>Timeline</h2>

      {/* Live counters */}
      <div className="timeline-stats">
        <div className="tstat">
          <span className="tstat-label">Satellites</span>
          <span className="tstat-val sat">{latest?.activeSatellites?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="tstat">
          <span className="tstat-label">Debris</span>
          <span className="tstat-val debris">{latest?.debrisCount?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="tstat">
          <span className="tstat-label">Collisions</span>
          <span className="tstat-val collision">{latest?.collisions?.toLocaleString() ?? "—"}</span>
        </div>
      </div>

      <div style={{ width: "100%", height: 180, marginTop: 8 }}>
        <ResponsiveContainer>
          <LineChart data={history} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="time" hide />
            <YAxis width={42} tick={{ fontSize: 10, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", fontSize: 12 }}
              labelStyle={{ color: "#94a3b8" }}
            />
            <Legend
              iconType="plainline"
              iconSize={14}
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            />
            <Line
              type="monotone"
              dataKey="activeSatellites"
              name="Satellites"
              stroke="#60a5fa"
              dot={false}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="debrisCount"
              name="Debris"
              stroke="#ef4444"
              dot={false}
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="collisions"
              name="Collisions"
              stroke="#f97316"
              dot={false}
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {peakDebris > 10 && (
        <p className="debris-warn">
          ⚠ Peak debris: {peakDebris.toLocaleString()} fragments
        </p>
      )}
    </section>
  );
}
