import { create } from 'zustand';
import { Vec3 } from '@/lib/orbitalMechanics';
import { PLANETS } from '@/lib/planetData';
import { MOONS } from '@/lib/moonData';
import { RelaySolution, EndpointSpec, resolveEndpointSpec } from '@/lib/relayAlgorithm';

/** A resolved orbital location: either a named orbit around a planet
 * (Low Mars Orbit, GEO, ...), one of the five Sun-planet Lagrange points, or
 * a free heliocentric orbit (a cycler trajectory, etc). Distinct from
 * `attachedPlanet`, which just means "at the planet itself." */
export interface OrbitalLocation {
  description: string; // e.g. "Aldrin Cycler (Earth-Mars transfer orbit)"
  source: 'builtin' | 'ai';
  spec: EndpointSpec;
  altitudeKm?: number;
  notes?: string;
}

export interface CoordPoint {
  label: string;
  x: number;
  y: number;
  z: number;
  /** If set, this point tracks a planet's or moon's live position instead
   * of the static x/y/z snapshot -- see `effectivePosition()`. Cleared the
   * moment the user manually edits a coordinate. Despite the name, this can
   * hold either a planet name or a moon name (resolved in
   * `pointToEndpointSpec`). */
  attachedPlanet?: string | null;
  /** If set, this point tracks a resolved orbital location (planet orbit,
   * Lagrange point, or free heliocentric orbit) instead of attachedPlanet or
   * the static x/y/z snapshot. Takes priority over attachedPlanet. Cleared
   * the moment the user manually edits a coordinate. */
  orbitalLocation?: OrbitalLocation | null;
}

export type FocusTarget = { type: 'planet'; name: string } | { type: 'solution' } | { type: 'none' };

interface SimState {
  date: Date;
  setDate: (d: Date) => void;

  pointA: CoordPoint;
  pointB: CoordPoint;
  setPointA: (p: Partial<CoordPoint>) => void;
  setPointB: (p: Partial<CoordPoint>) => void;

  solution: RelaySolution | null;
  solving: boolean;
  setSolution: (s: RelaySolution | null) => void;
  setSolving: (b: boolean) => void;

  focus: FocusTarget;
  setFocus: (f: FocusTarget) => void;

  geminiApiKey: string;
  setGeminiApiKey: (k: string) => void;
  geminiExplanation: string;
  setGeminiExplanation: (s: string) => void;
  geminiLoading: boolean;
  setGeminiLoading: (b: boolean) => void;

  selectedPlanet: string | null;
  setSelectedPlanet: (n: string | null) => void;

  ephemerisMode: 'kepler' | 'nasa-horizons';
  setEphemerisMode: (mode: 'kepler' | 'nasa-horizons') => void;

  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
}

const today = new Date();

export const useSimStore = create<SimState>((set) => ({
  date: today,
  setDate: (d) => set({ date: d }),

  pointA: { label: 'Point A', x: 1, y: 0, z: 0 },
  pointB: { label: 'Point B', x: 0, y: 5.2, z: 0.1 },
  setPointA: (p) => set((s) => ({ pointA: { ...s.pointA, ...p } })),
  setPointB: (p) => set((s) => ({ pointB: { ...s.pointB, ...p } })),

  solution: null,
  solving: false,
  setSolution: (s) => set({ solution: s }),
  setSolving: (b) => set({ solving: b }),

  focus: { type: 'none' },
  setFocus: (f) => set({ focus: f }),

  geminiApiKey: '',
  setGeminiApiKey: (k) => set({ geminiApiKey: k }),
  geminiExplanation: '',
  setGeminiExplanation: (s) => set({ geminiExplanation: s }),
  geminiLoading: false,
  setGeminiLoading: (b) => set({ geminiLoading: b }),

  selectedPlanet: null,
  setSelectedPlanet: (n) => set({ selectedPlanet: n }),

  ephemerisMode: 'kepler',
  setEphemerisMode: (mode) => set({ ephemerisMode: mode }),

  theme: 'dark',
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
}));

export function coordPointToVec(p: CoordPoint): Vec3 {
  return { x: p.x, y: p.y, z: p.z };
}

/**
 * Convert a CoordPoint into the spec the solver needs to correctly reason
 * about a full year: a planet-attached (or orbital-location-attached) point
 * must be treated as moving throughout the scan -- tracking that planet's,
 * Lagrange point's, or free orbit's real motion -- not frozen at wherever it
 * happened to be when this was called. An orbital location takes priority
 * over a plain planet attachment, which takes priority over the stored
 * static x/y/z.
 */
export function pointToEndpointSpec(p: CoordPoint): EndpointSpec {
  if (p.orbitalLocation) return p.orbitalLocation.spec;
  if (p.attachedPlanet) {
    if (PLANETS.some((pl) => pl.name === p.attachedPlanet)) return { kind: 'planet', planetName: p.attachedPlanet };
    if (MOONS.some((m) => m.name === p.attachedPlanet)) return { kind: 'moon', moonName: p.attachedPlanet };
  }
  return { kind: 'fixed', position: coordPointToVec(p) };
}

/**
 * The position a CoordPoint actually represents right now -- resolved live
 * from the same orbital model driving the 3D scene, not a static snapshot.
 * This is the single source of truth used for solving, rendering markers,
 * and displaying coordinates, so an attached/orbital-location point always
 * tracks its real position as the timeline moves.
 */
export function effectivePosition(p: CoordPoint, date: Date): Vec3 {
  return resolveEndpointSpec(pointToEndpointSpec(p), date);
}
