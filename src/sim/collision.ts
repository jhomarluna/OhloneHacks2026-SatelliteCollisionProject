import type { OrbitBand, SimConfig } from "../types/sim";

// Objects per band at launch (10k total / 8 bands = 1,250).
// Below this density, orbital space is considered "safe" — no collisions.
// Risk only accumulates from objects ABOVE this baseline, mimicking how
// Kessler syndrome only triggers when density exceeds a critical threshold.
const SAFE_BASELINE = 1250;

export function computeBandRisk(band: OrbitBand, config: SimConfig) {
  const objects = band.satelliteCount + band.debrisCount;
  // Only count objects above the safe baseline as collision risk drivers
  const excess = Math.max(0, objects - SAFE_BASELINE);
  const densityFactor = excess / Math.max(1, band.radius * 20);
  return Math.min(1, densityFactor * config.collisionThreshold * 0.04);
}

export function shouldTriggerCollision(risk: number) {
  return Math.random() < risk;
}
