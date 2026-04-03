import { create } from "zustand";
import { defaultConfig } from "../data/presets";
import { createInitialState } from "../sim/init";
import type { SimConfig, SimEvent, SimMetrics, SimState, SimStatus } from "../types/sim";
type Store = SimState & {
    setConfig: (patch: Partial<SimConfig>) => void;
    setRunning: (running: boolean) => void;
    reset: () => void;
    applyTick: (payload: Partial<SimState>) => void;
    pushEvent: (event: SimEvent) => void;
    setStatus: (status: SimStatus) => void;
    setMetrics: (metrics: SimMetrics) => void;
};
const initial = createInitialState(defaultConfig);
export const useSimStore = create<Store>((set) => ({
    ...initial,
    setConfig: (patch) =>
        set((state) => ({
            config: { ...state.config, ...patch },
        })),
    setRunning: (running) => set({ running }),
    reset: () => set(createInitialState(defaultConfig)),
    applyTick: (payload) => set((state) => ({ ...state, ...payload })),
    pushEvent: (event) =>
        set((state) => ({
            events: [event, ...state.events].slice(0, 25),
        })),
    setStatus: (status) => set({ status }),
    setMetrics: (metrics) => set({ metrics }),
}));