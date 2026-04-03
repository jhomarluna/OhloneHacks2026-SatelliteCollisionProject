import { useMemo } from "react";
  import { ControlPanel } from "./components/ControlPanel";
    import { EventLog } from "./components/EventLog";
  import { StatsPanel } from "./components/StatsPanel";
  import { TimelineChart } from "./components/TimelineChart";
  import { SceneRoot } from "./scene/SceneRoot";
  import { useSimStore } from "./store/simStore";
  export default function App() {
    const history = useSimStore((s) => s.history);
    const status = useSimStore((s) => s.status);
    const metrics = useSimStore((s) => s.metrics);
    const title = useMemo(() => {
      if (status === "runaway") return "Runaway Cascade";
      if (status === "unstable") return "Unstable Orbit";
      return "Nominal / Stable";
    }, [status]);
    return (
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Kessler Syndrome Simulator</h1>
            <p>{title}</p>
          </div>
</header>
        <main className="layout">
          <section className="viewport-panel">
            <SceneRoot />
          </section>
          <aside className="sidebar">
            <ControlPanel />
            <StatsPanel metrics={metrics} status={status} />
            <TimelineChart history={history} />
            <EventLog />
          </aside>
        </main>
</div> );
}