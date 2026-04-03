import type { OrbitBand, Satellite, SimState, SimConfig } from "../types/sim";

// CelesTrak GP data format (subset of fields we need)
interface GPRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  INCLINATION: number;   // degrees
  MEAN_MOTION: number;   // revs/day
  OBJECT_TYPE: string;
}

const EARTH_RADIUS_KM = 6371;
const GM = 398600.4418; // km³/s²

/** Convert mean motion (revs/day) to altitude in km */
function meanMotionToAltitude(n: number): number {
  const nSec = n / 86400; // revs/sec
  const a = Math.cbrt(GM / (4 * Math.PI * Math.PI * nSec * nSec)); // semi-major axis km
  return a - EARTH_RADIUS_KM;
}

/** Map altitude in km to 3D scene radius */
function altitudeToRadius(altKm: number): number {
  // LEO: 200-2000km → radius 1.6-3.5
  // Clamp to reasonable visual range
  const clamped = Math.max(200, Math.min(altKm, 2000));
  return 1.6 + ((clamped - 200) / 1800) * 1.9;
}

// Altitude band boundaries in km
const BAND_EDGES = [200, 400, 550, 700, 900, 1200, 1600, 2000];

interface BandBucket {
  altMin: number;
  altMax: number;
  count: number;
  inclinationSum: number;
  satellites: { alt: number; inc: number }[];
}

export interface RealDataResult {
  totalTracked: number;
  leoCount: number;
  bands: OrbitBand[];
  satellites: Satellite[];
}

export async function fetchRealSatelliteData(): Promise<RealDataResult> {
  const res = await fetch(
    "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json"
  );
  if (!res.ok) throw new Error(`CelesTrak fetch failed: ${res.status}`);

  const records: GPRecord[] = await res.json();
  const totalTracked = records.length;

  // Filter to LEO only (altitude < 2000km, mean motion > ~11.25 rev/day)
  const leoRecords = records.filter((r) => {
    const alt = meanMotionToAltitude(r.MEAN_MOTION);
    return alt > 150 && alt < 2000;
  });

  // Bucket into altitude bands
  const buckets: BandBucket[] = [];
  for (let i = 0; i < BAND_EDGES.length - 1; i++) {
    buckets.push({
      altMin: BAND_EDGES[i],
      altMax: BAND_EDGES[i + 1],
      count: 0,
      inclinationSum: 0,
      satellites: [],
    });
  }

  for (const rec of leoRecords) {
    const alt = meanMotionToAltitude(rec.MEAN_MOTION);
    const bucket = buckets.find((b) => alt >= b.altMin && alt < b.altMax);
    if (bucket) {
      bucket.count++;
      bucket.inclinationSum += rec.INCLINATION;
      bucket.satellites.push({ alt, inc: rec.INCLINATION });
    }
  }

  // Only create bands that have satellites
  const activeBuckets = buckets.filter((b) => b.count > 0);

  const bands: OrbitBand[] = activeBuckets.map((b, i) => {
    const midAlt = (b.altMin + b.altMax) / 2;
    const avgInc = b.inclinationSum / b.count;
    return {
      id: `band-${i + 1}`,
      altitudeKm: midAlt,
      radius: altitudeToRadius(midAlt),
      inclination: (avgInc * Math.PI) / 180 * 0.3, // scale down for visual clarity
      satelliteCount: 0, // will be set by engine
      debrisCount: 0,
      risk: 0,
    };
  });

  // Sample satellites — take proportional representation, max ~300 total
  const MAX_SATS = 300;
  const totalInBuckets = activeBuckets.reduce((s, b) => s + b.count, 0);

  const satellites: Satellite[] = [];
  activeBuckets.forEach((bucket, bandIdx) => {
    const band = bands[bandIdx];
    const sampleCount = Math.max(
      3,
      Math.round((bucket.count / totalInBuckets) * MAX_SATS)
    );
    const step = Math.max(1, Math.floor(bucket.satellites.length / sampleCount));

    for (let i = 0; i < bucket.satellites.length && satellites.length < MAX_SATS; i += step) {
      satellites.push({
        id: `${band.id}-sat-${satellites.length}`,
        bandId: band.id,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: 0.002 + Math.random() * 0.004,
        active: true,
      });
    }
  });

  // Update band satellite counts
  for (const band of bands) {
    band.satelliteCount = satellites.filter(
      (s) => s.bandId === band.id && s.active
    ).length;
  }

  return {
    totalTracked,
    leoCount: leoRecords.length,
    bands,
    satellites,
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
    debris: [],
    collisionEffects: [],
    running: false,
    status: "stable",
    metrics: {
      time: 0,
      activeSatellites: data.satellites.length,
      debrisCount: 0,
      collisions: 0,
      unusableBands: 0,
    },
    history: [],
    events: [],
  };
}
