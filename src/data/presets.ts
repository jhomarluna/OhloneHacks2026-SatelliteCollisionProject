import type { SimConfig } from "../types/sim";
export const defaultConfig: SimConfig = {
  timeScale: 10,
  collisionThreshold: 0.22,
  debrisPerCollision: 18,
  debrisSpreadChance: 0.15,
  cleanupRate: 0.01,
  bandCount: 4,
  satellitesPerBand: 30,
  launchRate: 0,
};
export const denseOrbitConfig: SimConfig = {
  ...defaultConfig,
  satellitesPerBand: 55,
  collisionThreshold: 0.32,
};
export const cascadeStartConfig: SimConfig = {
  ...defaultConfig,
  debrisPerCollision: 28,
  collisionThreshold: 0.4,
};