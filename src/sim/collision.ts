import type { OrbitBand, SimConfig } from "../types/sim";

// Objects per band at launch (10k total / 8 bands).
// Below this, orbital space is considered safe — no collisions.
const SAFE_BASELINE = 1250;

/** Satellite–satellite collision risk (only above safe baseline) */
export function computeBandRisk(band: OrbitBand, config: SimConfig): number {
  const objects = band.satelliteCount + band.debrisCount;
  const excess = Math.max(0, objects - SAFE_BASELINE);
  const densityFactor = excess / Math.max(1, band.radius * 20);
  return Math.min(1, densityFactor * config.collisionThreshold * 0.04);
}

/**
 * Debris–satellite collision risk.
 * Scales with debris × satellite pairs — uncontrolled debris is far more
 * dangerous than another satellite because it can't maneuver out of the way.
 */
export function computeDebrisSatelliteRisk(band: OrbitBand, config: SimConfig): number {
  if (band.debrisCount === 0 || band.satelliteCount === 0) return 0;
  const pairs = band.debrisCount * band.satelliteCount;
  const density = pairs / Math.max(1, band.radius * band.radius * 400);
  return Math.min(0.8, density * config.collisionThreshold * 0.001);
}

/**
 * Debris–debris collision risk.
 * Scales as n² (every pair of debris can collide) — this is the core
 * Kessler mechanism that drives exponential fragment growth.
 */
export function computeDebrisDebrisRisk(band: OrbitBand): number {
  if (band.debrisCount < 3) return 0;
  const pairs = (band.debrisCount * (band.debrisCount - 1)) / 2;
  const density = pairs / Math.max(1, band.radius * band.radius * 1000);
  return Math.min(0.5, density * 0.03);
}

export function shouldTriggerCollision(risk: number): boolean {
  return Math.random() < risk;
}
