
import { create } from "zustand";
import { defaultConfig } from "../data/presets";
import { createInitialState, orbitalAngularVelocity } from "../sim/init";
import { altKmToSceneRadius, computeRealSatPosition } from "../data/celestrakService";
import type {
  CollisionEffect,
  RealSatellite,
  SimConfig,
  SimEvent,
  SimMetrics,
  SimState,
  SimStatus,
} from "../types/sim";

type Store = SimState & {
  // Real satellite state
  realSatellites: RealSatellite[];
  selectedSatId: string | null;
  selectedSimSatIds: string[];
  celestrakStatus: 'idle' | 'loading' | 'loaded' | 'error';

  // Existing actions
  setConfig: (patch: Partial<SimConfig>) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
  applyTick: (payload: Partial<SimState>) => void;
  pushEvent: (event: SimEvent) => void;
  setStatus: (status: SimStatus) => void;
  setMetrics: (metrics: SimMetrics) => void;

  // Real satellite actions
  setRealSatellites: (sats: RealSatellite[]) => void;
  setCelestrakStatus: (status: Store['celestrakStatus']) => void;
  selectSatellite: (id: string | null) => void;
  explodeRealSatellite: (id: string) => void;

  // Sim satellite actions
  selectSimSatellite: (id: string | null) => void;
  toggleSimSatellite: (id: string) => void;
  clearSimSelection: () => void;
  removeSimSatellite: (id: string) => void;
  reinitWithCount: (totalSatellites: number) => void;
  addSimSatellites: (countPerBand: number) => void;
  forceCollision: () => void;
};

const initial = createInitialState(defaultConfig);

export const useSimStore = create<Store>((set) => ({
  ...initial,

  // Real satellite initial state
  realSatellites: [],
  selectedSatId: null,
  selectedSimSatIds: [],
  celestrakStatus: 'idle',

  // ── Existing actions ──────────────────────────────────────────────────────
  setConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),
  setRunning: (running) => set({ running }),
  reset: () => set((state) => ({ ...createInitialState(state.config) })),
  applyTick: (payload) => set((state) => ({ ...state, ...payload })),
  pushEvent: (event) =>
    set((state) => ({ events: [event, ...state.events].slice(0, 25) })),
  setStatus: (status) => set({ status }),
  setMetrics: (metrics) => set({ metrics }),

  // ── Real satellite actions ────────────────────────────────────────────────
  setRealSatellites: (sats) => set({ realSatellites: sats, celestrakStatus: 'loaded' }),
  setCelestrakStatus: (celestrakStatus) => set({ celestrakStatus }),
  selectSatellite: (selectedSatId) => set({ selectedSatId, selectedSimSatIds: [] }),

  explodeRealSatellite: (id) =>
    set((state) => {
      const sat = state.realSatellites.find((s) => s.id === id);
      if (!sat || !sat.active) return state;

      // Compute current scene position
      const [px, py, pz] = computeRealSatPosition(sat, Date.now(), state.config.timeScale);

      // Find nearest existing band for debris distribution
      const sceneR = altKmToSceneRadius(sat.altitudeKm);
      const nearestBand = state.bands.reduce((best, b) =>
        Math.abs(b.radius - sceneR) < Math.abs(best.radius - sceneR) ? b : best
      );

      const debrisCount = state.config.debrisPerCollision;
      const baseOmega = orbitalAngularVelocity(sat.altitudeKm);
      const newDebris = Array.from({ length: debrisCount }, (_, i) => ({
        id: `real-debris-${id}-${Date.now()}-${i}`,
        bandId: nearestBand.id,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: baseOmega * (1.0 + Math.random() * 0.3),
        lifetime: 500,
        raan: (sat.raan * Math.PI / 180) + (Math.random() - 0.5) * Math.PI,
        inclination: sat.inclination + (Math.random() - 0.5) * 30,
      }));

      const effect: CollisionEffect = {
        id: `fx-${id}-${Date.now()}`,
        position: [px, py, pz],
        createdAt: performance.now(),
      };

      const event: SimEvent = {
        id: `event-${id}-${Date.now()}`,
        t: state.metrics.time,
        message: `${sat.name} destroyed — ${debrisCount} debris fragments generated`,
      };

      return {
        realSatellites: state.realSatellites.map((s) =>
          s.id === id ? { ...s, active: false } : s
        ),
        debris: [...state.debris, ...newDebris],
        collisionEffects: [...state.collisionEffects, effect],
        events: [event, ...state.events].slice(0, 25),
        selectedSatId: null,
        metrics: {
          ...state.metrics,
          debrisCount: state.metrics.debrisCount + debrisCount,
          collisions: state.metrics.collisions + 1,
        },
      };
    }),

  // ── Sim satellite actions ─────────────────────────────────────────────────
  selectSimSatellite: (id) => set({ selectedSimSatIds: id ? [id] : [], selectedSatId: null }),

  toggleSimSatellite: (id) => set((state) => {
    const ids = state.selectedSimSatIds
    const has = ids.includes(id)
    return {
      selectedSimSatIds: has ? ids.filter((x) => x !== id) : [...ids, id],
      selectedSatId: null,
    }
  }),

  clearSimSelection: () => set({ selectedSimSatIds: [] }),

  removeSimSatellite: (id) => set((state) => ({
    selectedSimSatIds: state.selectedSimSatIds.filter((x) => x !== id),
  })),

  reinitWithCount: (totalSatellites) =>
    set(() => {
      const perBand = Math.ceil(totalSatellites / defaultConfig.bandCount);
      const config = { ...defaultConfig, satellitesPerBand: perBand };
      return { ...createInitialState(config) };
    }),

  addSimSatellites: (countPerBand) =>
    set((state) => {
      const now = Date.now();
      const newSatellites = state.bands.flatMap((band) => {
        const baseOmega = orbitalAngularVelocity(band.altitudeKm);
        return Array.from({ length: countPerBand }, (_, i) => ({
          id: `${band.id}-added-${now}-${i}`,
          bandId: band.id,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: baseOmega * (0.98 + Math.random() * 0.04),
          active: true,
          raan: Math.random() * Math.PI * 2,
          inclination: band.inclination + (Math.random() - 0.5) * 8,
        }));
      });
      return { satellites: [...state.satellites, ...newSatellites] };
    }),

  forceCollision: () =>
    set((state) => {
      // Pick the most densely populated band
      const band = [...state.bands].sort(
        (a, b) => b.satelliteCount + b.debrisCount - (a.satelliteCount + a.debrisCount)
      )[0];
      if (!band) return state;

      const victims = state.satellites
        .filter((s) => s.bandId === band.id && s.active)
        .slice(0, 2);

      const debrisCount = state.config.debrisPerCollision * 2;
      const now = Date.now();
      const baseOmega = orbitalAngularVelocity(band.altitudeKm);
      const newDebris = Array.from({ length: debrisCount }, (_, i) => ({
        id: `forced-${now}-${i}`,
        bandId: band.id,
        angle: Math.random() * Math.PI * 2,
        // Debris moves slightly faster than parent orbit (energy from collision)
        angularVelocity: baseOmega * (1.0 + Math.random() * 0.3),
        lifetime: 500,
        raan: Math.random() * Math.PI * 2,
        inclination: band.inclination + (Math.random() - 0.5) * 30,
      }));

      const effect: CollisionEffect = {
        id: `fx-forced-${now}`,
        position: [band.radius, 0, 0],
        createdAt: performance.now(),
      };

      const event: SimEvent = {
        id: `event-forced-${now}`,
        t: state.metrics.time,
        message: `FORCED collision in ${band.id} — ${debrisCount} fragments!`,
      };

      return {
        satellites: state.satellites.map((s) =>
          victims.some((v) => v.id === s.id) ? { ...s, active: false } : s
        ),
        debris: [...state.debris, ...newDebris],
        collisionEffects: [...state.collisionEffects, effect],
        events: [event, ...state.events].slice(0, 25),
      };
    }),
}));
