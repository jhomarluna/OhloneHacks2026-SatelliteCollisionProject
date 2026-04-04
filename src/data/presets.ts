import type { SimConfig } from "../types/sim";
export const defaultConfig: SimConfig = {
  timeScale: 50,
  collisionThreshold: 0.35,
  debrisPerCollision: 18,
  debrisSpreadChance: 0.15,
  cleanupRate: 0.01,
  bandCount: 8,
  satellitesPerBand: 1250, // 8 × 1250 = ~10,000 satellites — current real-world LEO population
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