import { OrbitalElements, AU_KM, PLANETS } from './planetData';
import { Vec3, planetPositionAtDate, vecAdd } from './orbitalMechanics';

export interface MoonInfo {
  name: string;
  parentPlanet: string;
  color: string;
  radiusKm: number;
  /** purely for visual scale in the 3D scene, like PlanetInfo.visualRadius */
  visualRadius: number;
  description: string;
  /** Orbital elements relative to the PARENT PLANET (not the Sun). `a` is
   * the true semi-major axis in AU (converted from km), so the resulting
   * position from the same Kepler solver used for planets is the real,
   * physically accurate planet-relative offset -- see moonPositionAtDate(). */
  elements: OrbitalElements;
  /** Rotation period in hours (used for surface-settlement day/night
   * visibility -- see relayAlgorithm.ts). Every moon in this list is a real,
   * observationally confirmed tidally-locked body, so this is set equal to
   * the real orbital period -- not an assumption of convenience. */
  rotationPeriodHours: number;
  /** Axial tilt in degrees, used the same way as PlanetInfo.tilt. Treated as
   * 0 for all moons here as a simplification (their true obliquities are
   * small and, for several, not precisely published) -- fine for
   * illustrating the day/night rotation cycle, which is dominated by the
   * rotation period, not by a few degrees of tilt. */
  tilt: number;
}

/**
 * Build planet-relative orbital elements from real published values
 * (semi-major axis in km, eccentricity, inclination in degrees, orbital
 * period in days). Like the AI-identified heliocentric orbits elsewhere in
 * this app, the starting phase (mean longitude at J2000) is not modeled --
 * only real period/eccentricity/inclination are -- so a moon's exact
 * position on a specific date is illustrative, but its period, distance,
 * and orbital shape are real. Inclination is taken relative to the planet's
 * own orbital plane (a simplification vs. the true reference, usually the
 * planet's equator or Laplace plane) -- appropriate for a system-scale
 * visualization, not spacecraft navigation.
 */
function moonElements(semiMajorAxisKm: number, eccentricity: number, inclinationDeg: number, periodDays: number): OrbitalElements {
  const a = semiMajorAxisKm / AU_KM;
  const LDot = (360 * 36525) / periodDays; // degrees per Julian century
  return { a, aDot: 0, e: eccentricity, eDot: 0, i: inclinationDeg, iDot: 0, L: 0, LDot, peri: 0, periDot: 0, node: 0, nodeDot: 0 };
}

/** Bundles the orbital elements with the (tidally-locked) rotation period,
 * so the same real period number isn't duplicated by hand at each call site. */
function moonBody(semiMajorAxisKm: number, eccentricity: number, inclinationDeg: number, periodDays: number) {
  return {
    elements: moonElements(semiMajorAxisKm, eccentricity, inclinationDeg, periodDays),
    rotationPeriodHours: periodDays * 24,
    tilt: 0,
  };
}

export const MOONS: MoonInfo[] = [
  {
    name: 'Moon',
    parentPlanet: 'Earth',
    color: '#c9c9c9',
    radiusKm: 1737.4,
    visualRadius: 0.1,
    description: "Earth's only natural satellite, likely formed from a giant impact early in solar system history.",
    ...moonBody(384400, 0.0549, 5.145, 27.322),
  },
  {
    name: 'Phobos',
    parentPlanet: 'Mars',
    color: '#8a7863',
    radiusKm: 11.1,
    visualRadius: 0.045,
    description: "The larger of Mars' two moons, orbiting so close and fast it rises in the west and sets in the east twice a day.",
    ...moonBody(9376, 0.0151, 1.093, 0.31891),
  },
  {
    name: 'Deimos',
    parentPlanet: 'Mars',
    color: '#9c8b76',
    radiusKm: 6.2,
    visualRadius: 0.035,
    description: "Mars' smaller, more distant moon, likely a captured asteroid.",
    ...moonBody(23463, 0.00033, 1.788, 1.263),
  },
  {
    name: 'Io',
    parentPlanet: 'Jupiter',
    color: '#e5d16b',
    radiusKm: 1821.6,
    visualRadius: 0.11,
    description: 'The most volcanically active body in the solar system, squeezed by Jupiter\'s tidal forces.',
    ...moonBody(421700, 0.0041, 0.036, 1.769),
  },
  {
    name: 'Europa',
    parentPlanet: 'Jupiter',
    color: '#d9c9a8',
    radiusKm: 1560.8,
    visualRadius: 0.1,
    description: 'Icy moon hiding a subsurface ocean, a top target in the search for life beyond Earth.',
    ...moonBody(671034, 0.009, 0.466, 3.551),
  },
  {
    name: 'Ganymede',
    parentPlanet: 'Jupiter',
    color: '#a89a86',
    radiusKm: 2634.1,
    visualRadius: 0.13,
    description: 'The largest moon in the solar system -- bigger than the planet Mercury.',
    ...moonBody(1070412, 0.0013, 0.177, 7.155),
  },
  {
    name: 'Callisto',
    parentPlanet: 'Jupiter',
    color: '#5f5648',
    radiusKm: 2410.3,
    visualRadius: 0.12,
    description: 'The most heavily cratered object in the solar system, the outermost Galilean moon.',
    ...moonBody(1882709, 0.0074, 0.192, 16.69),
  },
  {
    name: 'Mimas',
    parentPlanet: 'Saturn',
    color: '#c7c7c7',
    radiusKm: 198.2,
    visualRadius: 0.05,
    description: "Known for one giant crater that gives it a Death-Star-like appearance.",
    ...moonBody(185539, 0.0196, 1.574, 0.942),
  },
  {
    name: 'Enceladus',
    parentPlanet: 'Saturn',
    color: '#eef3f7',
    radiusKm: 252.1,
    visualRadius: 0.055,
    description: 'Small icy moon spraying water-ice plumes from a hidden subsurface ocean.',
    ...moonBody(237948, 0.0047, 0.009, 1.37),
  },
  {
    name: 'Tethys',
    parentPlanet: 'Saturn',
    color: '#d6d6d6',
    radiusKm: 531.1,
    visualRadius: 0.065,
    description: "One of Saturn's mid-sized icy moons.",
    ...moonBody(294619, 0.0001, 1.12, 1.888),
  },
  {
    name: 'Dione',
    parentPlanet: 'Saturn',
    color: '#cfcfcf',
    radiusKm: 561.4,
    visualRadius: 0.07,
    description: 'Icy moon streaked with bright, wispy fracture lines.',
    ...moonBody(377396, 0.0022, 0.019, 2.737),
  },
  {
    name: 'Rhea',
    parentPlanet: 'Saturn',
    color: '#c2c2c2',
    radiusKm: 763.8,
    visualRadius: 0.08,
    description: "Saturn's second-largest moon, possibly with a faint ring system of its own.",
    ...moonBody(527108, 0.001, 0.345, 4.518),
  },
  {
    name: 'Titan',
    parentPlanet: 'Saturn',
    color: '#e0a95c',
    radiusKm: 2574.7,
    visualRadius: 0.13,
    description: 'Larger than Mercury, with a thick nitrogen atmosphere and lakes of liquid methane.',
    ...moonBody(1221870, 0.0288, 0.348, 15.945),
  },
  {
    name: 'Iapetus',
    parentPlanet: 'Saturn',
    color: '#8f7a63',
    radiusKm: 734.5,
    visualRadius: 0.08,
    description: 'A two-toned moon -- one hemisphere dark as coal, the other bright ice.',
    ...moonBody(3560820, 0.0286, 15.47, 79.32),
  },
  {
    name: 'Miranda',
    parentPlanet: 'Uranus',
    color: '#a9a9a9',
    radiusKm: 235.8,
    visualRadius: 0.05,
    description: "Uranus' smallest major moon, with an oddly patchworked, fractured surface.",
    ...moonBody(129900, 0.0013, 4.338, 1.413),
  },
  {
    name: 'Ariel',
    parentPlanet: 'Uranus',
    color: '#c3d3d6',
    radiusKm: 578.9,
    visualRadius: 0.065,
    description: 'The brightest of the major Uranian moons.',
    ...moonBody(190900, 0.0012, 0.041, 2.52),
  },
  {
    name: 'Umbriel',
    parentPlanet: 'Uranus',
    color: '#6e6e6e',
    radiusKm: 584.7,
    visualRadius: 0.065,
    description: 'The darkest of the major Uranian moons.',
    ...moonBody(266000, 0.0039, 0.128, 4.144),
  },
  {
    name: 'Titania',
    parentPlanet: 'Uranus',
    color: '#8f97a3',
    radiusKm: 788.4,
    visualRadius: 0.075,
    description: "Uranus' largest moon.",
    ...moonBody(436300, 0.0011, 0.079, 8.706),
  },
  {
    name: 'Oberon',
    parentPlanet: 'Uranus',
    color: '#7d7d7d',
    radiusKm: 761.4,
    visualRadius: 0.075,
    description: "Uranus' outermost major moon, heavily cratered.",
    ...moonBody(583500, 0.0014, 0.068, 13.463),
  },
  {
    name: 'Triton',
    parentPlanet: 'Neptune',
    color: '#c9d8e0',
    radiusKm: 1353.4,
    visualRadius: 0.11,
    description: "Neptune's largest moon, orbiting backwards (retrograde) -- almost certainly a captured Kuiper Belt object.",
    ...moonBody(354759, 0.000016, 156.885, 5.877),
  },
  {
    name: 'Proteus',
    parentPlanet: 'Neptune',
    color: '#5a5a5a',
    radiusKm: 210,
    visualRadius: 0.05,
    description: 'Large but very dark, irregularly shaped moon of Neptune.',
    ...moonBody(117647, 0.0005, 0.524, 1.122),
  },
];

export function moonsOf(planetName: string): MoonInfo[] {
  return MOONS.filter((m) => m.parentPlanet === planetName).sort((a, b) => a.elements.a - b.elements.a);
}

/**
 * The artistic scene-unit distance at which a moon is rendered from its
 * planet -- true orbital radii would be sub-pixel or overlapping the planet
 * at this scale (same reason planet body sizes are exaggerated around the
 * Sun). `index` is the moon's position in its planet's moon list ordered by
 * true distance (see moonsOf), so multiple moons fan out visibly in the
 * correct relative order even though the absolute spacing is fictional.
 */
export function moonVisualOrbitRadius(planetVisualRadius: number, index: number): number {
  return planetVisualRadius * 2.2 + index * Math.max(planetVisualRadius * 0.7, 0.12);
}

/**
 * A moon's true heliocentric position: its parent planet's heliocentric
 * position plus its real planet-relative offset (from the same Kepler
 * solver used everywhere else) -- so a moon used as a communication
 * endpoint has a genuinely correct position for distance/delay/occlusion
 * calculations, even though the 3D scene renders its orbit at an
 * exaggerated radius for visibility (see Moon.tsx).
 */
export function moonPositionAtDate(moon: MoonInfo, date: Date): Vec3 {
  const parent = PLANETS.find((p) => p.name === moon.parentPlanet);
  if (!parent) return { x: 0, y: 0, z: 0 };
  const parentPos = planetPositionAtDate(parent.elements, date);
  const relativeOffset = planetPositionAtDate(moon.elements, date);
  return vecAdd(parentPos, relativeOffset);
}

/** The moon's true position relative to its parent planet (AU) -- used to
 * derive the correct orbital *direction* for the exaggerated-radius render. */
export function moonRelativeOffset(moon: MoonInfo, date: Date): Vec3 {
  return planetPositionAtDate(moon.elements, date);
}
