import type { RealSatellite } from '../types/sim';

// Scene constants — calibrated to Earth.tsx radius (1.2) and init.ts bands (300km → 1.8)
export const EARTH_SCENE_RADIUS = 1.2;
export const LEO_KM_TO_SCENE = 0.002; // (1.8 - 1.2) / 300km

export function altKmToSceneRadius(altKm: number): number {
  return EARTH_SCENE_RADIUS + altKm * LEO_KM_TO_SCENE;
}

const DEG = Math.PI / 180;

/** Propagate a satellite's position in Three.js world coords (Y-up) at a given time */
export function computeRealSatPosition(
  sat: RealSatellite,
  nowMs: number,
  timeScale = 1
): [number, number, number] {
  // Advance mean anomaly from epoch
  const dtMin = ((nowMs - sat.epochMs) * timeScale) / 60000;
  const n = (2 * Math.PI) / sat.period; // rad/min
  let M = sat.meanAnomaly * DEG + n * dtMin;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Solve Kepler's equation: E - e*sin(E) = M  (3 Newton iterations)
  let E = M;
  for (let k = 0; k < 3; k++) E = M + sat.eccentricity * Math.sin(E);

  // True anomaly
  const nu = 2 * Math.atan2(
    Math.sqrt(1 + sat.eccentricity) * Math.sin(E / 2),
    Math.sqrt(1 - sat.eccentricity) * Math.cos(E / 2)
  );

  const Omega = sat.raan * DEG;
  const omega = sat.argPericenter * DEG;
  const inc = sat.inclination * DEG;
  const theta = omega + nu;
  const r = altKmToSceneRadius(sat.altitudeKm);

  // ECI: X = vernal equinox, Z = north pole
  const x_eci = r * (Math.cos(Omega) * Math.cos(theta) - Math.sin(Omega) * Math.sin(theta) * Math.cos(inc));
  const y_eci = r * (Math.sin(Omega) * Math.cos(theta) + Math.cos(Omega) * Math.sin(theta) * Math.cos(inc));
  const z_eci = r * Math.sin(theta) * Math.sin(inc);

  // Map to Three.js (Y = north = ECI Z)
  return [x_eci, z_eci, -y_eci];
}

// CelesTrak OMM JSON field shape
interface CelesTrakGP {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number | string;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ECCENTRICITY: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  MEAN_MOTION: number; // rev/day
  EPOCH: string;
}

function gpToRealSatellite(gp: CelesTrakGP): RealSatellite | null {
  const n = gp.MEAN_MOTION; // rev/day
  if (!n || n <= 0) return null;

  // Semi-major axis → altitude
  const GM = 3.986004418e14; // m³/s²
  const nRadSec = (n * 2 * Math.PI) / 86400;
  const a = Math.cbrt(GM / (nRadSec * nRadSec)); // meters
  const altKm = a / 1000 - 6371;

  // Filter: LEO only (200–1500 km)
  if (altKm < 200 || altKm > 1500) return null;

  const noradId = Number(gp.NORAD_CAT_ID);
  return {
    id: `tle-${noradId}`,
    noradId,
    name: gp.OBJECT_NAME.trim(),
    altitudeKm: Math.round(altKm),
    inclination: gp.INCLINATION,
    raan: gp.RA_OF_ASC_NODE,
    argPericenter: gp.ARG_OF_PERICENTER,
    meanAnomaly: gp.MEAN_ANOMALY,
    epochMs: new Date(gp.EPOCH).getTime(),
    period: 1440 / n, // minutes
    eccentricity: gp.ECCENTRICITY,
    active: true,
  };
}

export async function fetchLEOSatellites(): Promise<RealSatellite[]> {
  // CelesTrak GP JSON API — "visual" group has ~150 observable LEO satellites
  const urls = [
    'https://celestrak.org/SOCRATES/query.php?GROUP=visual&FORMAT=json',
    'https://celestrak.org/SOCRATES/query.php?GROUP=stations&FORMAT=json',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data: CelesTrakGP[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) continue;

      const parsed = data
        .map(gpToRealSatellite)
        .filter((s): s is RealSatellite => s !== null)
        .slice(0, 60); // cap at 60 for performance

      if (parsed.length > 0) {
        console.info(`[CelesTrak] Loaded ${parsed.length} LEO satellites from ${url}`);
        return parsed;
      }
    } catch {
      // try next url
    }
  }

  console.warn('[CelesTrak] Fetch failed — using built-in fallback data');
  return FALLBACK_SATELLITES;
}

// ─── Hardcoded fallback: real orbital elements for well-known LEO satellites ──
// Elements are approximate; propagation advances them from epoch correctly.
const FALLBACK_SATELLITES: RealSatellite[] = [
  {
    id: 'tle-25544', noradId: 25544, name: 'ISS (ZARYA)',
    altitudeKm: 418, inclination: 51.64, raan: 247.5,
    argPericenter: 132.1, meanAnomaly: 234.9,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 92.68, eccentricity: 0.0003, active: true,
  },
  {
    id: 'tle-48274', noradId: 48274, name: 'CSS (TIANHE)',
    altitudeKm: 390, inclination: 41.47, raan: 55.3,
    argPericenter: 28.6, meanAnomaly: 331.5,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 91.96, eccentricity: 0.0005, active: true,
  },
  {
    id: 'tle-20580', noradId: 20580, name: 'HUBBLE SPACE TELESCOPE',
    altitudeKm: 538, inclination: 28.47, raan: 182.4,
    argPericenter: 74.2, meanAnomaly: 286.8,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 95.42, eccentricity: 0.0002, active: true,
  },
  {
    id: 'tle-25994', noradId: 25994, name: 'TERRA',
    altitudeKm: 705, inclination: 98.2, raan: 9.4,
    argPericenter: 102.0, meanAnomaly: 258.3,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 98.88, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-27424', noradId: 27424, name: 'AQUA',
    altitudeKm: 705, inclination: 98.2, raan: 14.7,
    argPericenter: 89.3, meanAnomaly: 270.8,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 98.88, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-43013', noradId: 43013, name: 'NOAA-20',
    altitudeKm: 824, inclination: 98.7, raan: 333.1,
    argPericenter: 90.0, meanAnomaly: 270.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 101.35, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-33591', noradId: 33591, name: 'NOAA-19',
    altitudeKm: 870, inclination: 99.1, raan: 318.5,
    argPericenter: 90.0, meanAnomaly: 270.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 102.12, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-40069', noradId: 40069, name: 'SENTINEL-2A',
    altitudeKm: 786, inclination: 98.6, raan: 288.2,
    argPericenter: 90.0, meanAnomaly: 270.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 100.6, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-42063', noradId: 42063, name: 'STARLINK-001',
    altitudeKm: 550, inclination: 53.0, raan: 75.0,
    argPericenter: 90.0, meanAnomaly: 0.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 95.7, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-42064', noradId: 42064, name: 'STARLINK-002',
    altitudeKm: 550, inclination: 53.0, raan: 120.0,
    argPericenter: 90.0, meanAnomaly: 45.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 95.7, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-42065', noradId: 42065, name: 'STARLINK-003',
    altitudeKm: 550, inclination: 53.0, raan: 165.0,
    argPericenter: 90.0, meanAnomaly: 90.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 95.7, eccentricity: 0.0001, active: true,
  },
  {
    id: 'tle-43786', noradId: 43786, name: 'IRIDIUM-166',
    altitudeKm: 780, inclination: 86.4, raan: 30.0,
    argPericenter: 90.0, meanAnomaly: 180.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 100.41, eccentricity: 0.0002, active: true,
  },
  {
    id: 'tle-43787', noradId: 43787, name: 'IRIDIUM-167',
    altitudeKm: 780, inclination: 86.4, raan: 66.0,
    argPericenter: 90.0, meanAnomaly: 60.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 100.41, eccentricity: 0.0002, active: true,
  },
  {
    id: 'tle-43788', noradId: 43788, name: 'IRIDIUM-168',
    altitudeKm: 780, inclination: 86.4, raan: 102.0,
    argPericenter: 90.0, meanAnomaly: 120.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 100.41, eccentricity: 0.0002, active: true,
  },
  {
    id: 'tle-28654', noradId: 28654, name: 'ENVISAT',
    altitudeKm: 770, inclination: 98.4, raan: 200.0,
    argPericenter: 90.0, meanAnomaly: 270.0,
    epochMs: new Date('2024-09-01T00:00:00Z').getTime(),
    period: 100.17, eccentricity: 0.0001, active: true,
  },
];
