import { PLANETS, AU_KM, PlanetInfo, OrbitalElements } from './planetData';
import { MOONS, MoonInfo, moonPositionAtDate } from './moonData';
import { SUN_VISUAL_RADIUS_SCENE, sceneToAu } from './constants';
import {
  Vec3,
  planetPositionAtDate,
  heliocentricPosition,
  centuriesSinceJ2000,
  vecCross,
  vecSub,
  vecAdd,
  vecScale,
  vecNormalize,
  vecLength,
  vecDot,
  rotateAroundAxis,
  pointSegmentDistance,
} from './orbitalMechanics';

const DEG2RAD = Math.PI / 180;

/** Radio-link safety margin added on top of a planet's physical radius (km),
 * to account for Fresnel-zone clearance / atmosphere / signal grazing.
 * Planets are small enough relative to their orbital spacing that this
 * modest, purely-physical margin never causes a visual mismatch with their
 * (also modestly exaggerated) rendered size, so it's used as-is. */
const SIGNAL_MARGIN_KM = 15000;

/**
 * The Sun is a special case: real deep-space missions already avoid close
 * solar approach by a wide margin during "solar conjunction," because
 * coronal plasma scintillation degrades a radio link long before the disk
 * itself would physically block it -- NASA's Deep Space Network routinely
 * holds off multi-degree Sun-probe angles for exactly this reason. That
 * real-world engineering practice happens to justify a generous standoff
 * radius, and we size it to match the Sun's rendered radius in the 3D scene
 * (itself exaggerated so the Sun is visible at all -- see AU_SCENE_UNITS in
 * constants.ts). The two effects reinforce rather than fight each other: a
 * recommended relay path both avoids real plasma interference AND never
 * visually clips through the rendered Sun. This only applies to the Sun --
 * inflating every planet's radius to its render size too (an earlier
 * version of this code did) needlessly compounds constraints and produces
 * absurdly long detours for no physical reason.
 */
const SUN_RADIUS_KM = 696000;
const SUN_PLASMA_MARGIN_KM = 250000;
const SUN_OCCLUSION_RADIUS_AU = Math.max(
  (SUN_RADIUS_KM + SUN_PLASMA_MARGIN_KM) / AU_KM,
  sceneToAu(SUN_VISUAL_RADIUS_SCENE)
);

/** The Sun-exclusion radius the solver actually enforces, in AU. */
export function sunOcclusionRadiusAU(): number {
  return SUN_OCCLUSION_RADIUS_AU;
}
export function planetOcclusionRadiusAU(planet: PlanetInfo): number {
  return (planet.radiusKm + SIGNAL_MARGIN_KM) / AU_KM;
}
/** Moons use a smaller, still-real margin (5,000 km) -- most are far
 * smaller than planets, and a 15,000 km margin would swamp small moons
 * like Deimos (radius ~6 km) with an artificially oversized exclusion zone. */
const MOON_SIGNAL_MARGIN_KM = 5000;
export function moonOcclusionRadiusAU(moon: MoonInfo): number {
  return (moon.radiusKm + MOON_SIGNAL_MARGIN_KM) / AU_KM;
}

/**
 * An endpoint that either sits fixed in space, tracks a planet's live
 * orbital position, sits at one of a planet's Lagrange points, or follows an
 * independent heliocentric orbit (a cycler trajectory, an asteroid-like
 * path, etc. -- see resolveEndpointSpec). This matters a great deal for the
 * year-long occlusion scan below: a point "attached" to Mercury physically
 * sweeps all the way around the Sun roughly 4 times over a year, so treating
 * it as frozen at today's snapshot (as an earlier version of this code did)
 * misses every real conjunction Mercury's actual motion would create or
 * avoid. The same applies to Lagrange points and free heliocentric orbits.
 */
export type EndpointSpec =
  | { kind: 'fixed'; position: Vec3 }
  | { kind: 'planet'; planetName: string }
  | { kind: 'moon'; moonName: string }
  | { kind: 'lagrange'; planetName: string; point: 'L1' | 'L2' | 'L4' | 'L5' }
  | { kind: 'heliocentric'; a: number; e: number; i: number }
  | { kind: 'surface'; bodyName: string; latDeg: number; lonDeg: number };

export type PositionFn = (date: Date) => Vec3;

/** A body (planet or moon) that can host a fixed surface settlement --
 * unifies the fields both PlanetInfo and MoonInfo carry for this purpose. */
interface RotatingBody {
  name: string;
  radiusKm: number;
  tilt: number;
  rotationPeriodHours: number;
  centerAt: (date: Date) => Vec3;
}

function findRotatingBody(name: string): RotatingBody | null {
  const planet = PLANETS.find((p) => p.name === name);
  if (planet) {
    return {
      name: planet.name,
      radiusKm: planet.radiusKm,
      tilt: planet.tilt,
      rotationPeriodHours: planet.rotationPeriodHours,
      centerAt: (date) => planetPositionAtDate(planet.elements, date),
    };
  }
  const moon = MOONS.find((m) => m.name === name);
  if (moon) {
    return {
      name: moon.name,
      radiusKm: moon.radiusKm,
      tilt: moon.tilt,
      rotationPeriodHours: moon.rotationPeriodHours,
      centerAt: (date) => moonPositionAtDate(moon, date),
    };
  }
  return null;
}

/**
 * A fixed point on a rotating body's surface -- the physics a ground
 * settlement actually experiences: as the body spins, the settlement is
 * only able to see a given direction in space while that direction is above
 * its local horizon, exactly like day/night or satellite rise/set on Earth.
 *
 * Modeled as a rigid sphere with a fixed spin axis (tilted `tilt` degrees
 * from the ecliptic pole, with an arbitrary but fixed reference longitude at
 * J2000 -- real axial precession and a true prime-meridian epoch aren't
 * modeled, the same simplification already used for AI-identified orbit
 * phases elsewhere in this app). What IS real: the rotation period (drives
 * how fast the horizon sweeps) and latitude/longitude (drive exactly which
 * directions are ever visible at all).
 */
function surfaceDirection(body: RotatingBody, latDeg: number, lonDeg: number, date: Date): Vec3 {
  const spinAxis = vecNormalize({ x: 0, y: -Math.sin(body.tilt * DEG2RAD), z: Math.cos(body.tilt * DEG2RAD) });
  const eclipticX: Vec3 = { x: 1, y: 0, z: 0 };
  const eqRef1 = vecNormalize(vecSub(eclipticX, vecScale(spinAxis, vecDot(eclipticX, spinAxis))));
  const eqRef2 = vecCross(spinAxis, eqRef1);

  const j2000 = new Date('2000-01-01T12:00:00Z');
  const hoursSinceEpoch = (date.getTime() - j2000.getTime()) / 3600000;
  const phaseDeg = body.rotationPeriodHours !== 0 ? (360 * hoursSinceEpoch) / body.rotationPeriodHours : 0;

  const latRad = latDeg * DEG2RAD;
  const lonRad = (lonDeg + phaseDeg) * DEG2RAD;
  const equatorial = vecAdd(vecScale(eqRef1, Math.cos(lonRad)), vecScale(eqRef2, Math.sin(lonRad)));
  return vecAdd(vecScale(equatorial, Math.cos(latRad)), vecScale(spinAxis, Math.sin(latRad)));
}

function surfaceSettlementPosition(bodyName: string, latDeg: number, lonDeg: number, date: Date): Vec3 {
  const body = findRotatingBody(bodyName);
  if (!body) return { x: 0, y: 0, z: 0 };
  const center = body.centerAt(date);
  const dir = surfaceDirection(body, latDeg, lonDeg, date);
  const radiusAU = body.radiusKm / AU_KM;
  return vecAdd(center, vecScale(dir, radiusAU));
}

/**
 * L1 sits between the Sun and the planet, L2 just beyond it, at distance
 * a * (massRatioToSun/3)^(1/3) from the planet along the Sun-planet line --
 * the standard linearized circular-restricted-3-body-problem approximation.
 * Unlike L4/L5, these are unstable equilibria in reality (a station there
 * needs active station-keeping), which is noted in the UI rather than
 * silently implied.
 */
export function computeL1L2(planet: PlanetInfo, date: Date): { L1: Vec3; L2: Vec3 } {
  const r = planetPositionAtDate(planet.elements, date);
  const dist = vecLength(r);
  const unit = vecNormalize(r);
  const alpha = Math.cbrt(planet.massRatioToSun / 3);
  return {
    L1: vecScale(unit, dist * (1 - alpha)),
    L2: vecScale(unit, dist * (1 + alpha)),
  };
}

/**
 * Builds a static (non-precessing) Keplerian ellipse from just (a, e, i) --
 * used for AI-identified heliocentric orbits (e.g. an Earth-Mars cycler)
 * where only the orbit's shape is known/estimated, not its exact phase.
 * The orbital period (and therefore how fast the object moves along it) is
 * still real, via Kepler's third law (T_years = a^1.5); only the starting
 * phase at J2000 (L=0, periapsis at the ascending node) is a simplifying
 * assumption, which is why this is labeled "illustrative" in the UI.
 */
function staticHeliocentricElements(a: number, e: number, i: number): OrbitalElements {
  const periodYears = Math.pow(Math.max(a, 0.01), 1.5);
  const LDotPerCentury = (360 / periodYears) * 100;
  return { a, aDot: 0, e, eDot: 0, i, iDot: 0, L: 0, LDot: LDotPerCentury, peri: 0, periDot: 0, node: 0, nodeDot: 0 };
}

export function resolveEndpointSpec(spec: EndpointSpec, date: Date): Vec3 {
  if (spec.kind === 'fixed') return spec.position;
  if (spec.kind === 'heliocentric') {
    return heliocentricPosition(staticHeliocentricElements(spec.a, spec.e, spec.i), centuriesSinceJ2000(date));
  }
  if (spec.kind === 'surface') {
    return surfaceSettlementPosition(spec.bodyName, spec.latDeg, spec.lonDeg, date);
  }
  if (spec.kind === 'moon') {
    const moon = MOONS.find((m) => m.name === spec.moonName);
    return moon ? moonPositionAtDate(moon, date) : { x: 0, y: 0, z: 0 };
  }
  const planet = PLANETS.find((p) => p.name === spec.planetName);
  if (!planet) return { x: 0, y: 0, z: 0 };
  if (spec.kind === 'lagrange') {
    if (spec.point === 'L1' || spec.point === 'L2') {
      const { L1, L2 } = computeL1L2(planet, date);
      return spec.point === 'L1' ? L1 : L2;
    }
    const { L4, L5 } = computeLagrangePoints(planet, date);
    return spec.point === 'L4' ? L4 : L5;
  }
  return planetPositionAtDate(planet.elements, date);
}

function constPos(v: Vec3): PositionFn {
  return () => v;
}
function specPos(spec: EndpointSpec): PositionFn {
  return (date) => resolveEndpointSpec(spec, date);
}

export interface LagrangeCandidate {
  id: string;
  label: string;
  planet: string;
  point: 'L4' | 'L5';
  position: Vec3; // AU, evaluated at the reference date the candidate list was built for
  color: string;
}

/**
 * L4 and L5 are two of the five Lagrange points of the restricted 3-body
 * problem (Sun + planet). For any mass ratio below ~0.0385 (true of every
 * planet vs. the Sun) they are dynamically stable equilibria, forming an
 * equilateral triangle with the Sun and the planet, leading (L4) or
 * trailing (L5) the planet by 60 degrees along its orbit. Because they are
 * stable, an object placed there needs no station-keeping fuel to remain on
 * station indefinitely -- exactly the "no intervention" requirement.
 *
 * We compute them by rotating the planet's instantaneous heliocentric
 * position vector by +/-60 degrees about the planet's orbital angular
 * momentum axis (found numerically from two nearby position samples).
 */
export function computeLagrangePoints(planet: PlanetInfo, date: Date): { L4: Vec3; L5: Vec3 } {
  const t0 = date;
  const t1 = new Date(date.getTime() + 3600 * 1000); // +1 hour, for velocity direction

  const r0 = planetPositionAtDate(planet.elements, t0);
  const r1 = planetPositionAtDate(planet.elements, t1);
  const v = vecSub(r1, r0);
  const normal = vecCross(r0, v); // orbital angular momentum direction

  const L4 = rotateAroundAxis(r0, normal, (60 * Math.PI) / 180);
  const L5 = rotateAroundAxis(r0, normal, (-60 * Math.PI) / 180);
  return { L4, L5 };
}

export function allLagrangeCandidates(date: Date): LagrangeCandidate[] {
  const out: LagrangeCandidate[] = [];
  for (const planet of PLANETS) {
    const { L4, L5 } = computeLagrangePoints(planet, date);
    out.push({
      id: `${planet.name}-L4`,
      label: `${planet.name} L4`,
      planet: planet.name,
      point: 'L4',
      position: L4,
      color: planet.color,
    });
    out.push({
      id: `${planet.name}-L5`,
      label: `${planet.name} L5`,
      planet: planet.name,
      point: 'L5',
      position: L5,
      color: planet.color,
    });
  }
  return out;
}

/**
 * A relay candidate co-orbits with its parent planet (that's what makes L4/L5
 * stable), so its position also moves over the course of a year -- this
 * resolves where it actually is at any given date, not just where it was
 * when the candidate list was generated.
 */
function candidatePos(candidate: LagrangeCandidate): PositionFn {
  return (date) => {
    const planet = PLANETS.find((p) => p.name === candidate.planet);
    if (!planet) return candidate.position;
    const { L4, L5 } = computeLagrangePoints(planet, date);
    return candidate.point === 'L4' ? L4 : L5;
  };
}

/** Is the segment A-B occluded by any planet, moon, or the Sun, at a single instant in time? */
export function isSegmentOccluded(a: Vec3, b: Vec3, date: Date): { occluded: boolean; by?: string } {
  {
    const { distance, t } = pointSegmentDistance({ x: 0, y: 0, z: 0 }, a, b);
    if (distance < SUN_OCCLUSION_RADIUS_AU && t > 0.001 && t < 0.999) {
      return { occluded: true, by: 'Sun' };
    }
  }
  for (const planet of PLANETS) {
    const pos = planetPositionAtDate(planet.elements, date);
    const { distance, t } = pointSegmentDistance(pos, a, b);
    const radiusAU = (planet.radiusKm + SIGNAL_MARGIN_KM) / AU_KM;
    // Only counts as blocking if the closest approach lies strictly within the segment
    if (distance < radiusAU && t > 0.001 && t < 0.999) {
      return { occluded: true, by: planet.name };
    }
  }
  for (const moon of MOONS) {
    const pos = moonPositionAtDate(moon, date);
    const { distance, t } = pointSegmentDistance(pos, a, b);
    const radiusAU = moonOcclusionRadiusAU(moon);
    if (distance < radiusAU && t > 0.001 && t < 0.999) {
      return { occluded: true, by: moon.name };
    }
  }
  return { occluded: false };
}

export interface ClearanceReport {
  clear: boolean;
  worstMarginAU: number; // smallest clearance margin found (negative = occluded)
  blockingEvents: { date: Date; planet: string }[];
}

/**
 * Check whether the segment between two (possibly moving) endpoints stays
 * clear of every body across [startMs, endMs], sampled. Both endpoints are
 * re-resolved at every sample date, so a planet-attached endpoint's own
 * motion is correctly accounted for, not just third-party occluders.
 */
function checkPathClearInRange(posA: PositionFn, posB: PositionFn, startMs: number, endMs: number, samples: number): ClearanceReport {
  let worstMarginAU = Infinity;
  const blockingEvents: { date: Date; planet: string }[] = [];

  for (let s = 0; s <= samples; s++) {
    const date = new Date(startMs + (s / samples) * (endMs - startMs));
    const a = posA(date);
    const b = posB(date);

    {
      const { distance, t } = pointSegmentDistance({ x: 0, y: 0, z: 0 }, a, b);
      if (t > 0.001 && t < 0.999) {
        const margin = distance - SUN_OCCLUSION_RADIUS_AU;
        if (margin < worstMarginAU) worstMarginAU = margin;
        if (margin < 0) blockingEvents.push({ date, planet: 'Sun' });
      }
    }

    for (const planet of PLANETS) {
      const pos = planetPositionAtDate(planet.elements, date);
      const { distance, t } = pointSegmentDistance(pos, a, b);
      if (t <= 0.001 || t >= 0.999) continue;
      const radiusAU = (planet.radiusKm + SIGNAL_MARGIN_KM) / AU_KM;
      const margin = distance - radiusAU;
      if (margin < worstMarginAU) worstMarginAU = margin;
      if (margin < 0) blockingEvents.push({ date, planet: planet.name });
    }

    for (const moon of MOONS) {
      const pos = moonPositionAtDate(moon, date);
      const { distance, t } = pointSegmentDistance(pos, a, b);
      if (t <= 0.001 || t >= 0.999) continue;
      const radiusAU = moonOcclusionRadiusAU(moon);
      const margin = distance - radiusAU;
      if (margin < worstMarginAU) worstMarginAU = margin;
      if (margin < 0) blockingEvents.push({ date, planet: moon.name });
    }
  }
  if (worstMarginAU === Infinity) worstMarginAU = 0;
  return { clear: blockingEvents.length === 0, worstMarginAU, blockingEvents };
}

/** Check whether the fixed segment A-B stays clear of every planet across a whole year, sampled. */
export function checkSegmentClearOverYear(a: Vec3, b: Vec3, startDate: Date, samples = 52): ClearanceReport {
  return checkPathClearInRange(constPos(a), constPos(b), startDate.getTime(), startDate.getTime() + 365.25 * 86400000, samples);
}

/** Same as above, but for endpoints that may themselves be moving (planet-attached). */
export function checkSpecClearOverYear(aSpec: EndpointSpec, bSpec: EndpointSpec, startDate: Date, samples = 52): ClearanceReport {
  return checkPathClearInRange(specPos(aSpec), specPos(bSpec), startDate.getTime(), startDate.getTime() + 365.25 * 86400000, samples);
}

export interface OcclusionWindow {
  startDate: Date;
  endDate: Date;
  bodies: string[];
}

/**
 * Scan a full year day-by-day and group consecutive occluded days into
 * contiguous blackout windows (e.g. a ~week-long solar conjunction, or a
 * brief planetary transit) -- this is what lets the planner tell "blocked
 * for 4 days in March" apart from "blocked all year." Endpoints are
 * resolved fresh at every sample date, so a planet-attached endpoint's own
 * orbital motion is part of the scan, not just third-party occluders.
 */
export function findOcclusionWindows(posA: PositionFn, posB: PositionFn, startDate: Date, samples = 366): OcclusionWindow[] {
  const yearMs = 365.25 * 86400000;
  const stepMs = yearMs / samples;
  const windows: OcclusionWindow[] = [];
  let current: OcclusionWindow | null = null;

  for (let s = 0; s <= samples; s++) {
    const date = new Date(startDate.getTime() + s * stepMs);
    const { occluded, by } = isSegmentOccluded(posA(date), posB(date), date);
    if (occluded) {
      if (!current) {
        current = { startDate: date, endDate: date, bodies: by ? [by] : [] };
      } else {
        current.endDate = date;
        if (by && !current.bodies.includes(by)) current.bodies.push(by);
      }
    } else if (current) {
      windows.push(current);
      current = null;
    }
  }
  if (current) windows.push(current);
  return windows;
}

function findBestSingleRelay(
  posA: PositionFn,
  posB: PositionFn,
  aRef: Vec3,
  bRef: Vec3,
  refDate: Date,
  candidates: LagrangeCandidate[],
  isClear: (p1: PositionFn, p2: PositionFn) => boolean
): { c: LagrangeCandidate; positionAtRef: Vec3; length: number } | null {
  let best: { c: LagrangeCandidate; positionAtRef: Vec3; length: number } | null = null;
  for (const c of candidates) {
    const cPos = candidatePos(c);
    if (!isClear(posA, cPos)) continue;
    if (!isClear(cPos, posB)) continue;
    const positionAtRef = cPos(refDate);
    const length = vecLength(vecSub(positionAtRef, aRef)) + vecLength(vecSub(bRef, positionAtRef));
    if (!best || length < best.length) best = { c, positionAtRef, length };
  }
  return best;
}

function findBestDualRelay(
  posA: PositionFn,
  posB: PositionFn,
  aRef: Vec3,
  bRef: Vec3,
  refDate: Date,
  candidates: LagrangeCandidate[],
  isClear: (p1: PositionFn, p2: PositionFn) => boolean
): { c1: LagrangeCandidate; c2: LagrangeCandidate; pos1AtRef: Vec3; pos2AtRef: Vec3; length: number } | null {
  let best: { c1: LagrangeCandidate; c2: LagrangeCandidate; pos1AtRef: Vec3; pos2AtRef: Vec3; length: number } | null = null;
  for (const c1 of candidates) {
    const c1Pos = candidatePos(c1);
    if (!isClear(posA, c1Pos)) continue;
    for (const c2 of candidates) {
      if (c1.id === c2.id) continue;
      const c2Pos = candidatePos(c2);
      if (!isClear(c1Pos, c2Pos)) continue;
      if (!isClear(c2Pos, posB)) continue;
      const pos1AtRef = c1Pos(refDate);
      const pos2AtRef = c2Pos(refDate);
      const length = vecLength(vecSub(pos1AtRef, aRef)) + vecLength(vecSub(pos2AtRef, pos1AtRef)) + vecLength(vecSub(bRef, pos2AtRef));
      if (!best || length < best.length) best = { c1, c2, pos1AtRef, pos2AtRef, length };
    }
  }
  return best;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** If this endpoint is a fixed surface settlement, its parent body's rotation
 * period -- used to detect the case where a full year's worth of "seasonal
 * window" analysis would be the wrong model entirely (see solveRelayPath). */
function surfaceRotationPeriodHours(spec: EndpointSpec): number | null {
  if (spec.kind !== 'surface') return null;
  const body = findRotatingBody(spec.bodyName);
  return body ? body.rotationPeriodHours : null;
}

/**
 * Fraction of one full rotation during which A-B has direct, unobstructed
 * line-of-sight -- sampled finely over exactly one rotation period (not the
 * whole year, since the pattern repeats every rotation). This is what tells
 * a settlement operator "you get power/comms for about X% of each day,"
 * independent of any longer-timescale conjunction effects.
 */
function surfaceDutyCycleFraction(aSpec: EndpointSpec, bSpec: EndpointSpec, startDate: Date, rotationPeriodHours: number): number {
  const posA = specPos(aSpec);
  const posB = specPos(bSpec);
  const periodMs = Math.abs(rotationPeriodHours) * 3600 * 1000;
  const samples = 96;
  let clearCount = 0;
  for (let s = 0; s < samples; s++) {
    const date = new Date(startDate.getTime() + (s / samples) * periodMs);
    const a = posA(date);
    const b = posB(date);
    if (!isSegmentOccluded(a, b, date).occluded) clearCount++;
  }
  return clearCount / samples;
}

export interface ConditionalWindow {
  startDate: Date;
  endDate: Date;
  blockingBodies: string[];
  relays: LagrangeCandidate[];
  hops: { from: Vec3; to: Vec3; label: string }[];
  pathLengthAU: number;
}

export interface RelaySolution {
  type: 'direct' | 'single-relay' | 'dual-relay' | 'conditional';
  relays: LagrangeCandidate[];
  totalPathLengthAU: number;
  hops: { from: Vec3; to: Vec3; label: string }[];
  report: string[];
  /** Only set when type === 'conditional': the direct link is used for most
   * of the year, and these brief windows are when a relay is substituted in. */
  conditionalWindows?: ConditionalWindow[];
  /** Only set when type === 'conditional': fraction of the year (0-1) the
   * direct link alone is sufficient. */
  directClearFraction?: number;
}

/**
 * Handles the case where either endpoint is a fixed surface settlement whose
 * own parent-body rotation, not solar conjunction, is the dominant blocking
 * effect. A rotating settlement's local horizon sweeps around once per
 * rotation, and since a Sun-planet Lagrange-point relay is roughly fixed in
 * heliocentric space, it rises and sets from the settlement's point of view
 * on much the same cadence as anything else in the sky -- so no single such
 * relay can promise full 24/7 coverage the way it can for a conjunction-only
 * blackout. Rather than search (uselessly) for one that's ever fully clear,
 * this picks whichever candidate maximizes combined visibility over exactly
 * one rotation, and reports the limitation honestly.
 */
function solveRotatingSurfaceEndpoint(
  aSpec: EndpointSpec,
  bSpec: EndpointSpec,
  startDate: Date,
  posA: PositionFn,
  posB: PositionFn,
  aNow: Vec3,
  bNow: Vec3,
  rotationPeriodHours: number,
  dutyCycle: number,
  report: string[]
): RelaySolution {
  const settlementBodyName = aSpec.kind === 'surface' ? aSpec.bodyName : bSpec.kind === 'surface' ? bSpec.bodyName : '?';
  const periodDays = Math.abs(rotationPeriodHours) / 24;
  report.push(
    `Direct line-of-sight is limited by ${settlementBodyName}'s own rotation (period ~${periodDays.toFixed(2)} days): the settlement's local horizon only faces the target's direction for part of each rotation, independent of any solar conjunction. Estimated direct-line duty cycle: ~${(dutyCycle * 100).toFixed(0)}% of each rotation.`
  );
  report.push(
    "No single heliocentric relay can fully outrun a rotating settlement's own horizon -- from the settlement's perspective, a Sun-planet Lagrange point rises and sets on roughly the same cadence as any other fixed direction in the sky. The relay below maximizes combined visibility, but genuine 24/7 coverage for a rotating settlement normally needs a local relay constellation in orbit around its own body (e.g. an areostationary satellite over the site), which is outside this planner's Lagrange-point-only relay model."
  );

  const candidates = allLagrangeCandidates(startDate);
  const rotationMs = periodDays * 86400000;
  let fallback: { c: LagrangeCandidate; score: number } | null = null;
  for (const c of candidates) {
    const cPos = candidatePos(c);
    const hop1 = checkPathClearInRange(posA, cPos, startDate.getTime(), startDate.getTime() + rotationMs, 96);
    const hop2 = checkPathClearInRange(cPos, posB, startDate.getTime(), startDate.getTime() + rotationMs, 96);
    const score = Math.min(hop1.worstMarginAU, hop2.worstMarginAU);
    if (!fallback || score > fallback.score) fallback = { c, score };
  }
  const chosen = fallback!;
  return {
    type: 'single-relay',
    relays: [chosen.c],
    totalPathLengthAU: vecLength(vecSub(chosen.c.position, aNow)) + vecLength(vecSub(bNow, chosen.c.position)),
    hops: [
      { from: aNow, to: chosen.c.position, label: `A -> ${chosen.c.label}` },
      { from: chosen.c.position, to: bNow, label: `${chosen.c.label} -> B` },
    ],
    report,
  };
}

/**
 * Find a relay configuration (using stable L4/L5 Lagrange points as
 * candidate relay-satellite stations) so that A and B can always
 * communicate across the whole year from startDate.
 *
 * A and B may each be a fixed point in space, or "attached" to a planet (in
 * which case they move with that planet's real orbital motion for the
 * entire year-long analysis -- important for fast-moving endpoints like
 * Mercury, whose position on any given future date is nothing like today's).
 *
 * If the direct link is blocked only for brief, transient windows (a
 * planetary transit, a solar conjunction) rather than being permanently
 * obstructed, the direct line is kept as the primary link and a relay is
 * only substituted in for those specific windows -- this mirrors how real
 * deep-space missions actually operate (e.g. Mars missions switch off
 * direct-to-Earth links only during solar conjunction, not year-round).
 */
export function solveRelayPath(aSpec: EndpointSpec, bSpec: EndpointSpec, startDate: Date): RelaySolution {
  const report: string[] = [];
  const yearMs = 365.25 * 86400000;
  const posA = specPos(aSpec);
  const posB = specPos(bSpec);
  const aNow = posA(startDate);
  const bNow = posB(startDate);

  // A fixed surface settlement is self-occluded by its own parent body's
  // rotation, roughly every rotation period -- a completely different
  // physical regime from a month-scale "solar conjunction" style blackout,
  // and one that a coarse ~daily year-long scan can badly alias against
  // (a rotation period close to exactly 24h, for instance, can look
  // deceptively "always clear" if sampled once a day at nearly the same
  // phase each time). So this case is detected and fully resolved up front,
  // using exact fine-grained sampling over one real rotation instead of the
  // year-long scan the rest of this function uses for everything else.
  const surfaceRotationHours = surfaceRotationPeriodHours(aSpec) ?? surfaceRotationPeriodHours(bSpec);

  if (surfaceRotationHours) {
    const dutyCycle = surfaceDutyCycleFraction(aSpec, bSpec, startDate, surfaceRotationHours);
    if (dutyCycle > 0.999) {
      report.push(
        "Direct line-of-sight is clear all year -- this settlement's geometry (e.g. near a pole, with the target near the rotation axis direction) keeps the target above the local horizon through the full rotation."
      );
      return {
        type: 'direct',
        relays: [],
        totalPathLengthAU: vecLength(vecSub(bNow, aNow)),
        hops: [{ from: aNow, to: bNow, label: 'Direct link A -> B' }],
        report,
      };
    }
    return solveRotatingSurfaceEndpoint(aSpec, bSpec, startDate, posA, posB, aNow, bNow, surfaceRotationHours, dutyCycle, report);
  }

  const windows = findOcclusionWindows(posA, posB, startDate, 366);

  if (windows.length === 0) {
    report.push('Direct line-of-sight A -> B is clear all year.');
    return {
      type: 'direct',
      relays: [],
      totalPathLengthAU: vecLength(vecSub(bNow, aNow)),
      hops: [{ from: aNow, to: bNow, label: 'Direct link A -> B' }],
      report,
    };
  }

  const blockedMs = windows.reduce((sum, w) => sum + Math.max(0, w.endDate.getTime() - w.startDate.getTime()), 0);
  const blockedFraction = blockedMs / yearMs;
  const candidates = allLagrangeCandidates(startDate);

  // Only attempt a conditional (direct-most-of-the-year) plan when the
  // blockage isn't essentially permanent -- otherwise a full-time relay is
  // simply the correct answer. (Rotating surface settlements are already
  // handled and returned above, before reaching this point.)
  if (blockedFraction < 0.85) {
    const conditionalWindows: ConditionalWindow[] = [];
    let allSolved = true;
    const padMs = 12 * 3600 * 1000; // safety buffer around each window's edges

    for (const w of windows) {
      const rangeStart = w.startDate.getTime() - padMs;
      const rangeEnd = w.endDate.getTime() + padMs;
      const isClear = (p1: PositionFn, p2: PositionFn) => checkPathClearInRange(p1, p2, rangeStart, rangeEnd, 24).clear;

      // Show the endpoints/relay at their actual position during this
      // window (its midpoint), not today's snapshot -- by the time a
      // future window arrives, a fast-moving endpoint like Mercury will be
      // somewhere else entirely.
      const windowMid = new Date((w.startDate.getTime() + w.endDate.getTime()) / 2);
      const aAtWindow = posA(windowMid);
      const bAtWindow = posB(windowMid);

      const single = findBestSingleRelay(posA, posB, aAtWindow, bAtWindow, windowMid, candidates, isClear);
      if (single) {
        conditionalWindows.push({
          startDate: w.startDate,
          endDate: w.endDate,
          blockingBodies: w.bodies,
          relays: [single.c],
          hops: [
            { from: aAtWindow, to: single.positionAtRef, label: `A -> ${single.c.label}` },
            { from: single.positionAtRef, to: bAtWindow, label: `${single.c.label} -> B` },
          ],
          pathLengthAU: single.length,
        });
        continue;
      }

      const pair = findBestDualRelay(posA, posB, aAtWindow, bAtWindow, windowMid, candidates, isClear);
      if (pair) {
        conditionalWindows.push({
          startDate: w.startDate,
          endDate: w.endDate,
          blockingBodies: w.bodies,
          relays: [pair.c1, pair.c2],
          hops: [
            { from: aAtWindow, to: pair.pos1AtRef, label: `A -> ${pair.c1.label}` },
            { from: pair.pos1AtRef, to: pair.pos2AtRef, label: `${pair.c1.label} -> ${pair.c2.label}` },
            { from: pair.pos2AtRef, to: bAtWindow, label: `${pair.c2.label} -> B` },
          ],
          pathLengthAU: pair.length,
        });
        continue;
      }

      allSolved = false;
      break;
    }

    if (allSolved) {
      const pct = ((1 - blockedFraction) * 100).toFixed(0);
      report.push(`Direct line-of-sight A -> B works for approximately ${pct}% of the year.`);
      for (const w of conditionalWindows) {
        report.push(
          `Temporary relay via ${w.relays.map((r) => r.label).join(' + ')} needed from ${formatDate(w.startDate)} to ${formatDate(w.endDate)} (blocked by ${w.blockingBodies.join(', ') || 'occlusion'}).`
        );
      }
      return {
        type: 'conditional',
        relays: [],
        totalPathLengthAU: vecLength(vecSub(bNow, aNow)),
        hops: [{ from: aNow, to: bNow, label: 'Direct link A -> B (most of the year)' }],
        report,
        conditionalWindows,
        directClearFraction: 1 - blockedFraction,
      };
    }
  }

  // Permanent relay required: direct link is blocked too much of the year
  // (or the brief-window plan above couldn't find a valid relay for every
  // window), so fall back to a relay that stays clear year-round.
  const isClearYear = (p1: PositionFn, p2: PositionFn) => checkPathClearInRange(p1, p2, startDate.getTime(), startDate.getTime() + yearMs, 52).clear;
  report.push(
    `Direct line-of-sight A -> B is blocked by ${Array.from(new Set(windows.flatMap((w) => w.bodies))).join(', ')} for a significant part of the year.`
  );

  const best = findBestSingleRelay(posA, posB, aNow, bNow, startDate, candidates, isClearYear);
  if (best) {
    report.push(
      `Found a stable single-relay solution at ${best.c.label} (a gravitationally stable Lagrange point requiring no station-keeping).`
    );
    return {
      type: 'single-relay',
      relays: [best.c],
      totalPathLengthAU: best.length,
      hops: [
        { from: aNow, to: best.positionAtRef, label: `A -> ${best.c.label}` },
        { from: best.positionAtRef, to: bNow, label: `${best.c.label} -> B` },
      ],
      report,
    };
  }

  report.push('No single relay keeps both hops clear all year; searching two-relay chains...');

  const pair = findBestDualRelay(posA, posB, aNow, bNow, startDate, candidates, isClearYear);
  if (pair) {
    report.push(`Found a stable dual-relay chain via ${pair.c1.label} and ${pair.c2.label}.`);
    return {
      type: 'dual-relay',
      relays: [pair.c1, pair.c2],
      totalPathLengthAU: pair.length,
      hops: [
        { from: aNow, to: pair.pos1AtRef, label: `A -> ${pair.c1.label}` },
        { from: pair.pos1AtRef, to: pair.pos2AtRef, label: `${pair.c1.label} -> ${pair.c2.label}` },
        { from: pair.pos2AtRef, to: bNow, label: `${pair.c2.label} -> B` },
      ],
      report,
    };
  }

  report.push(
    'No Lagrange-point relay chain (up to 2 hops) maintained year-round clearance; falling back to the least-occluded single relay available.'
  );
  // fallback: pick candidate minimizing worst-case combined negative margin
  let fallback: { c: LagrangeCandidate; score: number } | null = null;
  for (const c of candidates) {
    const cPos = candidatePos(c);
    const hop1 = checkPathClearInRange(posA, cPos, startDate.getTime(), startDate.getTime() + yearMs, 52);
    const hop2 = checkPathClearInRange(cPos, posB, startDate.getTime(), startDate.getTime() + yearMs, 52);
    const score = Math.min(hop1.worstMarginAU, hop2.worstMarginAU);
    if (!fallback || score > fallback.score) fallback = { c, score };
  }
  const chosen = fallback!;
  return {
    type: 'single-relay',
    relays: [chosen.c],
    totalPathLengthAU: vecLength(vecSub(chosen.c.position, aNow)) + vecLength(vecSub(bNow, chosen.c.position)),
    hops: [
      { from: aNow, to: chosen.c.position, label: `A -> ${chosen.c.label}` },
      { from: chosen.c.position, to: bNow, label: `${chosen.c.label} -> B` },
    ],
    report,
  };
}

/** Speed of light propagation delay for a given path length in AU. */
export function lightDelaySeconds(pathLengthAU: number): number {
  const c = 299792.458; // km/s
  return (pathLengthAU * AU_KM) / c;
}

export interface MonthlyScheduleEntry {
  label: string; // e.g. "Aug 2026"
  monthStart: Date;
  status: 'direct' | 'relay';
  relayLabel?: string;
  blockingBodies?: string[];
  /** true if the relay is only needed for part of this month (the window
   * starts/ends mid-month) rather than the whole month -- so the UI can say
   * "relay from the 26th" instead of implying the entire month is affected. */
  partial?: boolean;
  relayFromDay?: number;
  relayToDay?: number;
}

/**
 * Break a solved plan down into a month-by-month schedule for the 12 months
 * following `startDate` -- "which relay (if any) is needed this month" --
 * so the answer to "what do I need in March vs. July" is a glance, not a
 * mental overlay of the 3D scene and the window dates. When a blackout
 * window only covers part of a month, that's reflected explicitly (e.g.
 * "relay from the 26th") rather than marking the whole month as relay-only.
 */
export function buildMonthlySchedule(solution: RelaySolution, startDate: Date): MonthlyScheduleEntry[] {
  const entries: MonthlyScheduleEntry[] = [];

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(startDate);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    monthStart.setMonth(startDate.getMonth() + i);
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);
    monthEnd.setMilliseconds(-1);
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

    const label = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (solution.type === 'direct') {
      entries.push({ label, monthStart, status: 'direct' });
    } else if (solution.type === 'single-relay' || solution.type === 'dual-relay') {
      entries.push({
        label,
        monthStart,
        status: 'relay',
        relayLabel: solution.relays.map((r) => r.label).join(' + '),
      });
    } else if (solution.type === 'conditional') {
      const overlapping = solution.conditionalWindows?.find(
        (w) => w.startDate.getTime() <= monthEnd.getTime() && w.endDate.getTime() >= monthStart.getTime()
      );
      if (overlapping) {
        const clippedStart = Math.max(overlapping.startDate.getTime(), monthStart.getTime());
        const clippedEnd = Math.min(overlapping.endDate.getTime(), monthEnd.getTime());
        const relayFromDay = new Date(clippedStart).getDate();
        const relayToDay = new Date(clippedEnd).getDate();
        const partial = relayFromDay > 1 || relayToDay < daysInMonth;
        entries.push({
          label,
          monthStart,
          status: 'relay',
          relayLabel: overlapping.relays.map((r) => r.label).join(' + '),
          blockingBodies: overlapping.blockingBodies,
          partial,
          relayFromDay,
          relayToDay,
        });
      } else {
        entries.push({ label, monthStart, status: 'direct' });
      }
    }
  }

  return entries;
}
