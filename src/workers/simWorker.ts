import { tickSimulation } from "../sim/engine";
import type { SimState } from "../types/sim";
self.onmessage = (event: MessageEvent<{ type: string; state: SimState }>) => {
    if (event.data.type !== "TICK") return;
    const next = tickSimulation(event.data.state);
    self.postMessage({ type: "TICK_RESULT", payload: next });
};
export { };