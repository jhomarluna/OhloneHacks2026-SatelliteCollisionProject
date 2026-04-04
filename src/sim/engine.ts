import {
  computeBandRisk,
  computeDebrisSatelliteRisk,
  computeDebrisDebrisRisk,
  shouldTriggerCollision,
} from "./collision";
import type {
  CollisionEffect,
  DebrisFragment,
  SimEvent,
  SimState,
  TimelinePoint,
} from "../types/sim";

const DEG2RAD = Math.PI / 180;
// Debris persists for a very long time — it accumulates and drives cascade
const DEBRIS_LIFETIME = 12000;

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

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

function makeDebris(
  count: number,
  bandId: string,
  baseInclination: number,
  spread: number
): DebrisFragment[] {
  return Array.from({ length: count }, (_, i) => ({
    id: id(`debris-${bandId}-${i}`),
    bandId,
    angle: Math.random() * Math.PI * 2,
    angularVelocity: 0.004 + Math.random() * 0.008,
    lifetime: DEBRIS_LIFETIME,
    raan: Math.random() * Math.PI * 2,
    inclination: baseInclination + (Math.random() - 0.5) * spread,
  }));
}

export function tickSimulation(prev: SimState): Partial<SimState> {
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

  for (const band of prev.bands) {
    const bandDebrisCount = nextDebris.filter((d) => d.bandId === band.id).length;
    const bandSatCount = nextSatellites.filter((s) => s.bandId === band.id && s.active).length;

    const liveband = { ...band, debrisCount: bandDebrisCount, satelliteCount: bandSatCount };

    // ── 1. Satellite–satellite collisions ─────────────────────────────────
    if (shouldTriggerCollision(computeBandRisk(liveband, prev.config))) {
      collisionsThisTick++;
      const victims = nextSatellites
        .filter((s) => s.bandId === band.id && s.active)
        .slice(0, 2);

      if (victims.length > 0) {
        const v = victims[0];
        const pos = satPosition(v.angle, v.raan, v.inclination, band.radius);
        newEffects.push({ id: id("fx"), position: pos, createdAt: performance.now() });
        victims.forEach((s) => { s.active = false; });

        const frags = makeDebris(prev.config.debrisPerCollision, band.id, v.inclination, 30);
        nextDebris.push(...frags);
        newEvents.push({
          id: id("ev"),
          t: prev.metrics.time + 1,
          message: `Sat–sat collision in ${band.id} → ${frags.length} fragments`,
        });
      }
    }

    // ── 2. Debris–satellite collisions ────────────────────────────────────
    if (shouldTriggerCollision(computeDebrisSatelliteRisk(liveband, prev.config))) {
      collisionsThisTick++;
      const activeSats = nextSatellites.filter((s) => s.bandId === band.id && s.active);
      if (activeSats.length > 0) {
        const victim = activeSats[Math.floor(Math.random() * activeSats.length)];
        victim.active = false;
        const pos = satPosition(victim.angle, victim.raan, victim.inclination, band.radius);
        newEffects.push({ id: id("fx"), position: pos, createdAt: performance.now() });

        // Impact shreds the satellite into more fragments than a clean collision
        const fragCount = Math.floor(prev.config.debrisPerCollision * 0.8);
        const frags = makeDebris(fragCount, band.id, victim.inclination, 45);
        nextDebris.push(...frags);
        newEvents.push({
          id: id("ev"),
          t: prev.metrics.time + 1,
          message: `Debris struck satellite in ${band.id} → ${frags.length} fragments`,
        });
      }
    }

    // ── 3. Debris–debris collisions (n² cascade) ──────────────────────────
    if (shouldTriggerCollision(computeDebrisDebrisRisk(liveband))) {
      // Two fragments shatter into several smaller ones — net fragment gain
      const fragCount = 3 + Math.floor(Math.random() * 4); // 3–6 new pieces
      const refInc = band.inclination + (Math.random() - 0.5) * 60;
      const frags = makeDebris(fragCount, band.id, refInc, 60);
      nextDebris.push(...frags);
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
    unusableBands >= 2 || debrisCount > 2000
      ? "runaway"
      : debrisCount > 300 || totalCollisions > 5
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
