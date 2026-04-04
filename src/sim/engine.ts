import { computeBandRisk, shouldTriggerCollision } from "./collision";
import { orbitalAngularVelocity } from "./init";
import type {
  CollisionEffect,
  DebrisFragment,
  SimEvent,
  SimState,
  TimelinePoint,
} from "../types/sim";

const DEG2RAD = Math.PI / 180;

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Compute 3D ECI → Three.js position from individual orbital elements */
function satPosition(
  angle: number,
  raan: number,
  incDeg: number,
  radius: number
): [number, number, number] {
  const inc = incDeg * DEG2RAD;
  const x = radius * (Math.cos(raan) * Math.cos(angle) - Math.sin(raan) * Math.sin(angle) * Math.cos(inc));
  const y_eci = radius * (Math.sin(raan) * Math.cos(angle) + Math.cos(raan) * Math.sin(angle) * Math.cos(inc));
  const z_eci = radius * Math.sin(angle) * Math.sin(inc);
  return [x, z_eci, -y_eci];
}

export function tickSimulation(prev: SimState): Partial<SimState> {
  // Angles are NOT advanced here — the visual useFrame loop handles smooth
  // 60fps angle updates. The tick only handles collisions, metrics, and debris.
  const nextDebris = prev.debris
    .map((frag) => ({
      ...frag,
      lifetime: frag.lifetime - 1,
    }))
    .filter((frag) => frag.lifetime > 0);

  const newEvents: SimEvent[] = [];
  const newEffects: CollisionEffect[] = [];
  let collisionsThisTick = 0;
  const victimIds = new Set<string>();

  for (const band of prev.bands.map((b) => ({ ...b }))) {
    band.debrisCount = nextDebris.filter((d) => d.bandId === band.id).length;
    band.satelliteCount = prev.satellites.filter(
      (s) => s.bandId === band.id && s.active
    ).length;
    band.risk = computeBandRisk(band, prev.config);

    if (shouldTriggerCollision(band.risk)) {
      collisionsThisTick += 1;
      const victims = prev.satellites
        .filter((s) => s.bandId === band.id && s.active)
        .slice(0, 2);

      if (victims.length > 0) {
        const v = victims[0];
        const [px, py, pz] = satPosition(v.angle, v.raan, v.inclination, band.radius);
        newEffects.push({
          id: id("fx"),
          position: [px, py, pz],
          createdAt: performance.now(),
        });
      }

      victims.forEach((sat) => { victimIds.add(sat.id); });

      // Debris inherits the victim's inclination region ± spread, random RAAN
      const victimInc = victims[0]?.inclination ?? band.inclination;
      const baseOmega = orbitalAngularVelocity(band.altitudeKm);
      const fragments: DebrisFragment[] = Array.from(
        { length: prev.config.debrisPerCollision },
        (_, i) => ({
          id: id(`debris-${band.id}-${i}`),
          bandId: band.id,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: baseOmega * (1.0 + Math.random() * 0.3),
          lifetime: 500,
          raan: Math.random() * Math.PI * 2,
          inclination: victimInc + (Math.random() - 0.5) * 30,
        })
      );
      nextDebris.push(...fragments);

      newEvents.push({
        id: id("event"),
        t: prev.metrics.time + 1,
        message: `Collision in ${band.id} generated ${fragments.length} debris fragments`,
      });
    }
  }

  // Only create a new satellites array if a collision deactivated some —
  // avoids triggering React re-renders on every tick
  const nextSatellites = victimIds.size > 0
    ? prev.satellites.map((s) => victimIds.has(s.id) ? { ...s, active: false } : s)
    : prev.satellites;

  const nextBands = prev.bands.map((band) => {
    const b = { ...band };
    b.debrisCount = nextDebris.filter((d) => d.bandId === b.id).length;
    b.satelliteCount = nextSatellites.filter((s) => s.bandId === b.id && s.active).length;
    b.risk = computeBandRisk(b, prev.config);
    return b;
  });

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

  const now = performance.now();
  const activeEffects = [
    ...prev.collisionEffects.filter((e) => now - e.createdAt < 2000),
    ...newEffects,
  ];

  return {
    bands: nextBands,
    satellites: nextSatellites,
    debris: nextDebris,
    collisionEffects: activeEffects,
    metrics,
    history,
    status,
    events: [...newEvents, ...prev.events].slice(0, 25),
  };
}
