import type { OrbitBand, Satellite, DebrisFragment, SimState, SimConfig } from "../types/sim";

// CelesTrak GP data format (subset of fields we need)
interface GPRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  INCLINATION: number;   // degrees
  MEAN_MOTION: number;   // revs/day
  OBJECT_TYPE?: string;
}

const EARTH_RADIUS_KM = 6371;
const GM = 398600.4418; // km³/s²

// Satellite groups to fetch (ones that return 200)
const SAT_GROUPS = [
  "oneweb", "planet", "iridium-NEXT", "globalstar", "orbcomm",
  "stations", "spire", "gps-ops", "ses", "amateur", "noaa",
  "weather", "resource", "sarsat", "tdrss", "argos", "intelsat",
  "science", "education", "engineering", "military", "geo",
];

// Real debris fields from historical collisions/ASAT tests
const DEBRIS_GROUPS = [
  "fengyun-1c-debris",     // China ASAT test 2007 (~1857 pieces)
  "cosmos-2251-debris",    // Cosmos-Iridium collision 2009 (~579 pieces)
  "iridium-33-debris",     // Iridium-Cosmos collision 2009 (~107 pieces)
];

/** Convert mean motion (revs/day) to altitude in km */
function meanMotionToAltitude(n: number): number {
  const nSec = n / 86400;
  const a = Math.cbrt(GM / (4 * Math.PI * Math.PI * nSec * nSec));
  return a - EARTH_RADIUS_KM;
}

/** Map altitude in km to 3D scene radius */
function altitudeToRadius(altKm: number): number {
  const clamped = Math.max(200, Math.min(altKm, 2000));
  return 1.6 + ((clamped - 200) / 1800) * 1.9;
}

// Altitude band boundaries in km
const BAND_EDGES = [200, 400, 550, 700, 900, 1200, 1600, 2000];

interface BandBucket {
  altMin: number;
  altMax: number;
  satCount: number;
  debrisCount: number;
  inclinationSum: number;
}

export interface RealDataResult {
  totalTracked: number;
  leoCount: number;
  debrisLoaded: number;
  bands: OrbitBand[];
  satellites: Satellite[];
  debris: DebrisFragment[];
}

async function fetchGroup(group: string): Promise<GPRecord[]> {
  try {
    const res = await fetch(
      `/api/celestrak/NORAD/elements/gp.php?GROUP=${group}&FORMAT=json`
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchRealSatelliteData(): Promise<RealDataResult> {
  // Fetch satellite and debris groups in parallel
  const [satResults, debrisResults] = await Promise.all([
    Promise.all(SAT_GROUPS.map(fetchGroup)),
    Promise.all(DEBRIS_GROUPS.map(fetchGroup)),
  ]);

  // Deduplicate by NORAD catalog ID
  const seen = new Set<number>();
  const satRecords: GPRecord[] = [];
  for (const records of satResults) {
    for (const r of records) {
      if (!seen.has(r.NORAD_CAT_ID)) {
        seen.add(r.NORAD_CAT_ID);
        satRecords.push(r);
      }
    }
  }
  const debrisRecords: GPRecord[] = [];
  for (const records of debrisResults) {
    for (const r of records) {
      if (!seen.has(r.NORAD_CAT_ID)) {
        seen.add(r.NORAD_CAT_ID);
        debrisRecords.push(r);
      }
    }
  }

  const totalTracked = satRecords.length + debrisRecords.length;

  // Filter to LEO only
  const leoSats = satRecords.filter((r) => {
    const alt = meanMotionToAltitude(r.MEAN_MOTION);
    return alt > 150 && alt < 2000;
  });
  const leoDebris = debrisRecords.filter((r) => {
    const alt = meanMotionToAltitude(r.MEAN_MOTION);
    return alt > 150 && alt < 2000;
  });

  // Bucket into altitude bands
  const buckets: BandBucket[] = BAND_EDGES.slice(0, -1).map((_, i) => ({
    altMin: BAND_EDGES[i],
    altMax: BAND_EDGES[i + 1],
    satCount: 0,
    debrisCount: 0,
    inclinationSum: 0,
  }));

  function findBucket(alt: number) {
    return buckets.find((b) => alt >= b.altMin && alt < b.altMax);
  }

  for (const rec of leoSats) {
    const alt = meanMotionToAltitude(rec.MEAN_MOTION);
    const bucket = findBucket(alt);
    if (bucket) {
      bucket.satCount++;
      bucket.inclinationSum += rec.INCLINATION;
    }
  }
  for (const rec of leoDebris) {
    const alt = meanMotionToAltitude(rec.MEAN_MOTION);
    const bucket = findBucket(alt);
    if (bucket) {
      bucket.debrisCount++;
      bucket.inclinationSum += rec.INCLINATION;
    }
  }

  // Only create bands that have objects
  const activeBuckets = buckets.filter((b) => b.satCount + b.debrisCount > 0);

  const bands: OrbitBand[] = activeBuckets.map((b, i) => {
    const midAlt = (b.altMin + b.altMax) / 2;
    const total = b.satCount + b.debrisCount;
    const avgInc = total > 0 ? b.inclinationSum / total : 45;
    return {
      id: `band-${i + 1}`,
      altitudeKm: midAlt,
      radius: altitudeToRadius(midAlt),
      inclination: (avgInc * Math.PI) / 180 * 0.3,
      satelliteCount: 0,
      debrisCount: 0,
      risk: 0,
    };
  });

  // Create all satellites
  const satellites: Satellite[] = [];
  let satIdx = 0;
  for (const rec of leoSats) {
    const alt = meanMotionToAltitude(rec.MEAN_MOTION);
    const bucketIdx = activeBuckets.findIndex(
      (b) => alt >= b.altMin && alt < b.altMax
    );
    if (bucketIdx < 0) continue;
    const band = bands[bucketIdx];
    satellites.push({
      id: `${band.id}-sat-${satIdx++}`,
      bandId: band.id,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: 0.002 + Math.random() * 0.004,
      active: true,
    });
  }

  // Create debris from real debris fields
  const debris: DebrisFragment[] = [];
  let debIdx = 0;
  for (const rec of leoDebris) {
    const alt = meanMotionToAltitude(rec.MEAN_MOTION);
    const bucketIdx = activeBuckets.findIndex(
      (b) => alt >= b.altMin && alt < b.altMax
    );
    if (bucketIdx < 0) continue;
    const band = bands[bucketIdx];
    debris.push({
      id: `${band.id}-debris-${debIdx++}`,
      bandId: band.id,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: 0.004 + Math.random() * 0.008,
      lifetime: 9999, // real debris persists
    });
  }

  // Update band counts
  for (const band of bands) {
    band.satelliteCount = satellites.filter(
      (s) => s.bandId === band.id && s.active
    ).length;
    band.debrisCount = debris.filter((d) => d.bandId === band.id).length;
  }

  return {
    totalTracked,
    leoCount: leoSats.length,
    debrisLoaded: debris.length,
    bands,
    satellites,
    debris,
  };
}

/** Build a SimState from real data */
export function realDataToState(
  data: RealDataResult,
  config: SimConfig
): Partial<SimState> {
  return {
    bands: data.bands,
    satellites: data.satellites,
    debris: data.debris,
    collisionEffects: [],
    running: false,
    status: "stable",
    metrics: {
      time: 0,
      activeSatellites: data.satellites.length,
      debrisCount: data.debris.length,
      collisions: 0,
      unusableBands: 0,
    },
    history: [],
    events: [],
  };
}
