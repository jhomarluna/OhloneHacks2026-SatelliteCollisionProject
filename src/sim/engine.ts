import { computeBandRisk, shouldTriggerCollision } from "./collision";
import type {
  DebrisFragment,
  SimEvent,
  SimState,
  TimelinePoint,
} from "../types/sim";
function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function tickSimulation(prev: SimState): Partial<SimState> {
  const nextBands = prev.bands.map((band) => ({ ...band }));
  const nextSatellites = prev.satellites.map((sat) => ({
    ...sat,
    angle: sat.angle + sat.angularVelocity * prev.config.timeScale,
  }));
  const nextDebris = prev.debris
    .map((frag) => ({
      ...frag,
      angle: frag.angle + frag.angularVelocity * prev.config.timeScale,
      lifetime: frag.lifetime - 1,
    }))
    .filter((frag) => frag.lifetime > 0);
  const newEvents: SimEvent[] = [];
  let collisionsThisTick = 0;
for (const band of nextBands) {
band.debrisCount = nextDebris.filter((d) => d.bandId === band.id).length;
    band.satelliteCount = nextSatellites.filter(
      (s) => s.bandId === band.id && s.active
    ).length;
    band.risk = computeBandRisk(band, prev.config);
    if (shouldTriggerCollision(band.risk)) {
      collisionsThisTick += 1;
      const victims = nextSatellites
        .filter((s) => s.bandId === band.id && s.active)
        .slice(0, 2);
      victims.forEach((sat) => {
        sat.active = false;
});
      const fragments: DebrisFragment[] = Array.from(
        { length: prev.config.debrisPerCollision },
        (_, i) => ({
          id: id(`debris-${band.id}-${i}`),
          bandId: band.id,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: 0.004 + Math.random() * 0.008,
          lifetime: 500,
}) );
      nextDebris.push(...fragments);
      newEvents.push({
        id: id("event"),
        t: prev.metrics.time + 1,
        message: `Collision in ${band.id} generated ${fragments.length} debris fragments`,
}); }
}
  const activeSatellites = nextSatellites.filter((s) => s.active).length;
  const debrisCount = nextDebris.length;
  const unusableBands = nextBands.filter((b) => b.risk > 0.6).length;
  const totalCollisions = prev.metrics.collisions + collisionsThisTick;
  const metrics = {
    time: prev.metrics.time + 1,
    activeSatellites,
    debrisCount,
    collisions: totalCollisions,
    unusableBands,
};
  const history: TimelinePoint[] = [...prev.history, metrics].slice(-300);
  const status =
    unusableBands >= 2 || debrisCount > 500
      ? "runaway"
      : debrisCount > 120 || totalCollisions > 3
      ? "unstable"
      : "stable";
  return {
    bands: nextBands,
    satellites: nextSatellites,
    debris: nextDebris,
    metrics,
    history,
    status,
    events: [...newEvents, ...prev.events].slice(0, 25),
}; }