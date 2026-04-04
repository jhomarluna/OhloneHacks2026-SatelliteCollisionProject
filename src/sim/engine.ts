import { computeBandRisk, shouldTriggerCollision } from "./collision";
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
  // Advance angles (raan + inclination are orbital constants, unchanged)
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
  const newEffects: CollisionEffect[] = [];
  let collisionsThisTick = 0;

  for (const band of prev.bands.map((b) => ({ ...b }))) {
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

      if (victims.length > 0) {
        const v = victims[0];
        const [px, py, pz] = satPosition(v.angle, v.raan, v.inclination, band.radius);
        newEffects.push({
          id: id("fx"),
          position: [px, py, pz],
          createdAt: performance.now(),
        });
      }

      victims.forEach((sat) => { sat.active = false; });

      // Debris inherits the victim's inclination region ± spread, random RAAN
      const victimInc = victims[0]?.inclination ?? band.inclination;
      const fragments: DebrisFragment[] = Array.from(
        { length: prev.config.debrisPerCollision },
        (_, i) => ({
          id: id(`debris-${band.id}-${i}`),
          bandId: band.id,
          angle: Math.random() * Math.PI * 2,
          angularVelocity: 0.004 + Math.random() * 0.008,
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
