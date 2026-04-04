import type { SimConfig } from "../types/sim";
export const defaultConfig: SimConfig = {
  timeScale: 10,
  collisionThreshold: 0.22,
  debrisPerCollision: 18,
  debrisSpreadChance: 0.15,
  cleanupRate: 0.01,
  bandCount: 8,
  satellitesPerBand: 150, // dense swarm across 8 shells
};
export const denseOrbitConfig: SimConfig = {
  ...defaultConfig,
  satellitesPerBand: 180,
  collisionThreshold: 0.32,
};
export const cascadeStartConfig: SimConfig = {
  ...defaultConfig,
  debrisPerCollision: 28,
  collisionThreshold: 0.4,
};