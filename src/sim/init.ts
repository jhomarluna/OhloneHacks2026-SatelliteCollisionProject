import type {
  DebrisFragment,
  OrbitBand,
  Satellite,
  SimConfig,
  SimState,
} from "../types/sim";

// 8 bands spanning realistic LEO inclinations — equatorial through polar and retrograde
const BAND_INCLINATIONS = [28, 45, 53, 66, 75, 98, 120, 148];

function makeBands(config: SimConfig): OrbitBand[] {
  return Array.from({ length: config.bandCount }, (_, i) => ({
    id: `band-${i + 1}`,
    altitudeKm: 300 + i * 100,
    // Realistic LEO proportion: Earth radius = 2.5, Earth real radius = 6371 km
    radius: 2.5 * (1 + (300 + i * 100) / 6371),
    inclination: BAND_INCLINATIONS[i % BAND_INCLINATIONS.length],
    satelliteCount: config.satellitesPerBand,
    debrisCount: 0,
    risk: 0,
  }));
}

// Compute real orbital angular velocity (rad/s) from altitude
export function orbitalAngularVelocity(altKm: number): number {
  const GM = 3.986004418e14; // m³/s²
  const R = (6371 + altKm) * 1000; // meters
  const period = 2 * Math.PI * Math.sqrt((R * R * R) / GM); // seconds
  return (2 * Math.PI) / period; // rad/s
}

function makeSatellites(bands: OrbitBand[]): Satellite[] {
  return bands.flatMap((band) => {
    const baseOmega = orbitalAngularVelocity(band.altitudeKm);
    return Array.from({ length: band.satelliteCount }, (_, i) => ({
      id: `${band.id}-sat-${i}`,
      bandId: band.id,
      angle: Math.random() * Math.PI * 2,
      // Realistic angular velocity with ±2% variation
      angularVelocity: baseOmega * (0.98 + Math.random() * 0.04),
      active: true,
      // Fully random RAAN — each satellite gets an independent orbital plane
      raan: Math.random() * Math.PI * 2,
      // Wider spread around the band's characteristic inclination for fuller sphere
      inclination: band.inclination + (Math.random() - 0.5) * 20,
    }));
  });
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
  };
}
