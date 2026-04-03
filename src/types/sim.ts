
export type SimStatus = "stable" | "unstable" | "runaway";
export type OrbitBand = {
  id: string;
  altitudeKm: number;
  radius: number;
  satelliteCount: number;
  debrisCount: number;
  risk: number;
};
export type Satellite = {
  id: string;
  bandId: string;
  angle: number;
  angularVelocity: number;
  active: boolean;
};
export type DebrisFragment = {
  id: string;
  bandId: string;
  angle: number;
  angularVelocity: number;
  lifetime: number;
};
export type SimConfig = {
  timeScale: number;
  collisionThreshold: number;
  debrisPerCollision: number;
  debrisSpreadChance: number;
  cleanupRate: number;
  bandCount: number;
  satellitesPerBand: number;
};
export type SimMetrics = {
  time: number;
  activeSatellites: number;
  debrisCount: number;
  collisions: number;
  unusableBands: number;
};
export type TimelinePoint = SimMetrics;
export type SimEvent = {
  id: string;
  t: number;
  message: string;
};
export type SimState = {
  config: SimConfig;
  bands: OrbitBand[];
  satellites: Satellite[];
  debris: DebrisFragment[];
  metrics: SimMetrics;
  history: TimelinePoint[];
  events: SimEvent[];
  status: SimStatus;
  running: boolean;
};