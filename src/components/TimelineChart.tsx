import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
  import type { TimelinePoint } from "../types/sim";
  export function TimelineChart({ history }: { history: TimelinePoint[] }) {
    return (
      <section className="panel chart-panel">
        <h2>Timeline</h2>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={history}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="debrisCount" dot={false} />
              <Line type="monotone" dataKey="activeSatellites" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
); }