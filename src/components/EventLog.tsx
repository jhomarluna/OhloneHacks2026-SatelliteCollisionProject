 import { useSimStore } from "../store/simStore";
  export function EventLog() {
    const events = useSimStore((s) => s.events);
    return (
      <section className="panel">
        <h2>Event Log</h2>
        <div className="event-log">
          {events.length === 0 ? (
  <p>No events yet.</p> ):(
            events.map((event) => (
              <div key={event.id} className="event-item">
                <strong>T+{event.t}</strong>
                <span>{event.message}</span>
              </div>
)) )}
        </div>
      </section>
); }