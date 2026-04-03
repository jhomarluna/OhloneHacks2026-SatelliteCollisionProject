import type { SimConfig } from "../types/sim";
export const defaultConfig: SimConfig = {
    timeScale: 10,
    collisionThreshold: 0.22,
    debrisPerCollision: 18,
    debrisSpreadChance: 0.15,
    cleanupRate: 0.01,
    bandCount: 4,
    satellitesPerBand: 30,
};