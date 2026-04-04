
export type SimStatus = "stable" | "unstable" | "runaway";
export type RealSatellite = {
  id: string;
  noradId: number;
  name: string;
  altitudeKm: number;
  inclination: number; // degrees
  raan: number;        // right ascension of ascending node, degrees
  argPericenter: number; // degrees
  meanAnomaly: number;   // degrees at epoch
  epochMs: number;       // ms since unix epoch
  period: number;        // orbital period, minutes
  eccentricity: number;
  active: boolean;
};
export type OrbitBand = {
  id: string;
  altitudeKm: number;
  radius: number;
  inclination: number; // degrees — characteristic inclination for this band
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
  raan: number;        // radians — right ascension of ascending node
  inclination: number; // degrees — for color coding & 3D positioning
};
export type DebrisFragment = {
  id: string;
  bandId: string;
  angle: number;
  angularVelocity: number;
  lifetime: number;
  raan: number;        // radians
  inclination: number; // degrees
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
export type CollisionEffect = {
  id: string;
  position: [number, number, number];
  createdAt: number;
};
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
  collisionEffects: CollisionEffect[];
  metrics: SimMetrics;
  history: TimelinePoint[];
  events: SimEvent[];
  status: SimStatus;
  running: boolean;
};