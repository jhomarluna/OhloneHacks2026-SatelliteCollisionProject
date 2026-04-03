import type { OrbitBand, SimConfig } from "../types/sim";
export function computeBandRisk(band: OrbitBand, config: SimConfig) {
    const objects = band.satelliteCount + band.debrisCount;
    const densityFactor = objects / Math.max(1, band.radius * 20);
    return Math.min(1, densityFactor * config.collisionThreshold * 0.1);
}
export function shouldTriggerCollision(risk: number) {
    return Math.random() < risk;
}