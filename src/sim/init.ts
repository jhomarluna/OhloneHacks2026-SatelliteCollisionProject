import type {
  DebrisFragment,
  OrbitBand,
  Satellite,
  SimConfig,
  SimState,
} from "../types/sim";
function makeBands(config: SimConfig): OrbitBand[] {
  return Array.from({ length: config.bandCount }, (_, i) => ({
    id: `band-${i + 1}`,
    altitudeKm: 300 + i * 150,
    radius: 1.8 + i * 0.35,
    inclination: ((i * 0.4) - 0.6 + Math.random() * 0.2),
    satelliteCount: config.satellitesPerBand,
    debrisCount: 0,
    risk: 0,
  }));
}
function makeSatellites(bands: OrbitBand[]): Satellite[] {
  return bands.flatMap((band) =>
    Array.from({ length: band.satelliteCount }, (_, i) => ({
      id: `${band.id}-sat-${i}`,
      bandId: band.id,
      angle: (Math.PI * 2 * i) / band.satelliteCount,
      angularVelocity: 0.002 + Math.random() * 0.004,
      active: true,
})) );
}
export function createInitialState(config: SimConfig): SimState {
  const bands = makeBands(config);
  const satellites = makeSatellites(bands);
  const debris: DebrisFragment[] = [];
return {
config,
bands,
satellites,
debris,
collisionEffects: [],
running: false,
status: "stable",
metrics: {
      time: 0,
      activeSatellites: satellites.length,
      debrisCount: 0,
      collisions: 0,
      unusableBands: 0,
    },
    history: [],
    events: [],
}; }