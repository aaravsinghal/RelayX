import { OrbitalElements } from './planetData';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

const DEG2RAD = Math.PI / 180;

/** Julian Date from a JS Date (UTC). */
export function toJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}




/** Julian centuries since the J2000.0 epoch. */
export function centuriesSinceJ2000(date: Date): number {
  return (toJulianDate(date) - 2451545.0) / 36525;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Solve Kepler's equation M = E - e*sin(E) for E (radians), via Newton-Raphson. */
function solveKepler(mDeg: number, e: number): number {
  const M = mDeg * DEG2RAD;
  let E = e < 0.8 ? M : Math.PI;
  for (let iter = 0; iter < 100; iter++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

/**
 * Compute the heliocentric ecliptic Cartesian position (AU) of a body
 * given its Keplerian orbital elements, at a given Julian-century time T.
 */
export function heliocentricPosition(el: OrbitalElements, T: number): Vec3 {
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = el.i + el.iDot * T;
  const L = el.L + el.LDot * T;
  const longPeri = el.peri + el.periDot * T;
  const node = el.node + el.nodeDot * T;

  const omega = longPeri - node; // argument of perihelion
  const M = normalizeDeg(L - longPeri); // mean anomaly

  const E = solveKepler(M, e); // eccentric anomaly (radians)

  // position in the orbital plane
  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const wRad = omega * DEG2RAD;
  const iRad = i * DEG2RAD;
  const nodeRad = node * DEG2RAD;

  const cosW = Math.cos(wRad), sinW = Math.sin(wRad);
  const cosI = Math.cos(iRad), sinI = Math.sin(iRad);
  const cosN = Math.cos(nodeRad), sinN = Math.sin(nodeRad);

  const x =
    (cosN * cosW - sinN * sinW * cosI) * xOrb +
    (-cosN * sinW - sinN * cosW * cosI) * yOrb;
  const y =
    (sinN * cosW + cosN * sinW * cosI) * xOrb +
    (-sinN * sinW + cosN * cosW * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  return { x, y, z };
}

/** Convenience: planet position (AU, ecliptic) at a given JS Date. */
export function planetPositionAtDate(el: OrbitalElements, date: Date): Vec3 {
  const T = centuriesSinceJ2000(date);
  return heliocentricPosition(el, T);
}

/** Sample a full orbit path (for drawing the ellipse) as an array of points. */
export function sampleOrbitPath(el: OrbitalElements, date: Date, segments = 256): Vec3[] {
  const T = centuriesSinceJ2000(date);
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const i = el.i + el.iDot * T;
  const longPeri = el.peri + el.periDot * T;
  const node = el.node + el.nodeDot * T;
  const omega = longPeri - node;

  const wRad = omega * DEG2RAD;
  const iRad = i * DEG2RAD;
  const nodeRad = node * DEG2RAD;
  const cosW = Math.cos(wRad), sinW = Math.sin(wRad);
  const cosI = Math.cos(iRad), sinI = Math.sin(iRad);
  const cosN = Math.cos(nodeRad), sinN = Math.sin(nodeRad);

  const pts: Vec3[] = [];
  for (let s = 0; s <= segments; s++) {
    const E = (s / segments) * 2 * Math.PI;
    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const x =
      (cosN * cosW - sinN * sinW * cosI) * xOrb +
      (-cosN * sinW - sinN * cosW * cosI) * yOrb;
    const y =
      (sinN * cosW + cosN * sinW * cosI) * xOrb +
      (-sinN * sinW + cosN * cosW * cosI) * yOrb;
    const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    pts.push({ x, y, z });
  }
  return pts;
}

export function vecLength(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vecSub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vecScale(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function vecCross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vecDot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function vecNormalize(a: Vec3): Vec3 {
  const len = vecLength(a);
  if (len < 1e-12) return { x: 0, y: 0, z: 0 };
  return vecScale(a, 1 / len);
}

/** Rotate vector v by angle (radians) about unit axis k, using Rodrigues' formula. */
export function rotateAroundAxis(v: Vec3, k: Vec3, angleRad: number): Vec3 {
  const kUnit = vecNormalize(k);
  const cosT = Math.cos(angleRad);
  const sinT = Math.sin(angleRad);
  const kCrossV = vecCross(kUnit, v);
  const kDotV = vecDot(kUnit, v);
  return vecAdd(
    vecAdd(vecScale(v, cosT), vecScale(kCrossV, sinT)),
    vecScale(kUnit, kDotV * (1 - cosT))
  );
}

/**
 * Shortest distance from point P to the segment AB, and the closest point
 * on the segment (clamped to [0,1] parametrically).
 */
export function pointSegmentDistance(p: Vec3, a: Vec3, b: Vec3) {
  const ab = vecSub(b, a);
  const abLenSq = vecDot(ab, ab);
  let t = abLenSq < 1e-12 ? 0 : vecDot(vecSub(p, a), ab) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const closest = vecAdd(a, vecScale(ab, t));
  const dist = vecLength(vecSub(p, closest));
  return { distance: dist, t, closestPoint: closest };
}
