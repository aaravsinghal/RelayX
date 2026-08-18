// Keplerian orbital elements (J2000 epoch), low-precision analytical model
// Source: Standish, E.M. (1992) / JPL "Keplerian Elements for Approximate
// Positions of the Major Planets", valid for the interval 1800 AD - 2050 AD.
// a in AU, e dimensionless, angles in degrees, rates are per Julian century.

export interface OrbitalElements {
  a: number;
  aDot: number;
  e: number;
  eDot: number;
  i: number;
  iDot: number;
  L: number;
  LDot: number;
  peri: number; // longitude of perihelion (varpi)
  periDot: number;
  node: number; // longitude of ascending node (Omega)
  nodeDot: number;
}

export interface PlanetInfo {
  name: string;
  color: string;
  radiusKm: number;
  elements: OrbitalElements;
  /** purely for visual scale in the 3D scene (not to physical scale) */
  visualRadius: number;
  tilt: number;
  rotationPeriodHours: number;
  description: string;
  /** planet mass / solar mass -- used to locate the Sun-planet L1/L2
   * Lagrange points (linearized CRTBP: distance from planet along the
   * Sun-planet line is a * (massRatioToSun/3)^(1/3)). */
  massRatioToSun: number;
}

export const AU_KM = 149_597_870.7;

export const PLANETS: PlanetInfo[] = [
  {
    name: 'Mercury',
    color: '#b1adad',
    radiusKm: 2439.7,
    visualRadius: 0.14,
    tilt: 0.03,
    rotationPeriodHours: 1407.6,
    description: 'Smallest planet, closest to the Sun, extreme temperature swings.',
    massRatioToSun: 1.660e-7,
    elements: {
      a: 0.38709927, aDot: 0.00000037,
      e: 0.20563593, eDot: 0.00001906,
      i: 7.00497902, iDot: -0.00594749,
      L: 252.25032350, LDot: 149472.67411175,
      peri: 77.45779628, periDot: 0.16047689,
      node: 48.33076593, nodeDot: -0.12534081,
    },
  },
  {
    name: 'Venus',
    color: '#e8c39e',
    radiusKm: 6051.8,
    visualRadius: 0.34,
    tilt: 177.4,
    rotationPeriodHours: -5832.5,
    description: 'Hottest planet due to a runaway greenhouse atmosphere.',
    massRatioToSun: 2.447e-6,
    elements: {
      a: 0.72333566, aDot: 0.00000390,
      e: 0.00677672, eDot: -0.00004107,
      i: 3.39467605, iDot: -0.00078890,
      L: 181.97909950, LDot: 58517.81538729,
      peri: 131.60246718, periDot: 0.00268329,
      node: 76.67984255, nodeDot: -0.27769418,
    },
  },
  {
    name: 'Earth',
    color: '#3d7dd6',
    radiusKm: 6371.0,
    visualRadius: 0.36,
    tilt: 23.44,
    rotationPeriodHours: 23.934,
    description: 'Our home world, the only known planet with liquid surface water and life.',
    massRatioToSun: 3.003e-6,
    elements: {
      a: 1.00000261, aDot: 0.00000562,
      e: 0.01671123, eDot: -0.00004392,
      i: -0.00001531, iDot: -0.01294668,
      L: 100.46457166, LDot: 35999.37244981,
      peri: 102.93768193, periDot: 0.32327364,
      node: 0.0, nodeDot: 0.0,
    },
  },
  {
    name: 'Mars',
    color: '#c1440e',
    radiusKm: 3389.5,
    visualRadius: 0.19,
    tilt: 25.19,
    rotationPeriodHours: 24.623,
    description: 'The Red Planet, home to the largest volcano in the solar system.',
    massRatioToSun: 3.227e-7,
    elements: {
      a: 1.52371034, aDot: 0.00001847,
      e: 0.09339410, eDot: 0.00007882,
      i: 1.84969142, iDot: -0.00813131,
      L: -4.55343205, LDot: 19140.30268499,
      peri: -23.94362959, periDot: 0.44441088,
      node: 49.55953891, nodeDot: -0.29257343,
    },
  },
  {
    name: 'Jupiter',
    color: '#d9b38c',
    radiusKm: 69911,
    visualRadius: 1.4,
    tilt: 3.13,
    rotationPeriodHours: 9.925,
    description: 'Largest planet, a gas giant with a Great Red Spot storm.',
    massRatioToSun: 9.545e-4,
    elements: {
      a: 5.20288700, aDot: -0.00011607,
      e: 0.04838624, eDot: -0.00013253,
      i: 1.30439695, iDot: -0.00183714,
      L: 34.39644051, LDot: 3034.74612775,
      peri: 14.72847983, periDot: 0.21252668,
      node: 100.47390909, nodeDot: 0.20469106,
    },
  },
  {
    name: 'Saturn',
    color: '#e3d19c',
    radiusKm: 58232,
    visualRadius: 1.2,
    tilt: 26.73,
    rotationPeriodHours: 10.656,
    description: 'Ringed gas giant with the lowest density of any planet.',
    massRatioToSun: 2.858e-4,
    elements: {
      a: 9.53667594, aDot: -0.00125060,
      e: 0.05386179, eDot: -0.00050991,
      i: 2.48599187, iDot: 0.00193609,
      L: 49.95424423, LDot: 1222.49362201,
      peri: 92.59887831, periDot: -0.41897216,
      node: 113.66242448, nodeDot: -0.28867794,
    },
  },
  {
    name: 'Uranus',
    color: '#9fc9d3',
    radiusKm: 25362,
    visualRadius: 0.8,
    tilt: 97.77,
    rotationPeriodHours: -17.24,
    description: 'Ice giant that rotates almost on its side.',
    massRatioToSun: 4.365e-5,
    elements: {
      a: 19.18916464, aDot: -0.00196176,
      e: 0.04725744, eDot: -0.00004397,
      i: 0.77263783, iDot: -0.00242939,
      L: 313.23810451, LDot: 428.48202785,
      peri: 170.95427630, periDot: 0.40805281,
      node: 74.01692503, nodeDot: 0.04240589,
    },
  },
  {
    name: 'Neptune',
    color: '#5b7fd6',
    radiusKm: 24622,
    visualRadius: 0.78,
    tilt: 28.32,
    rotationPeriodHours: 16.11,
    description: 'Windiest planet, the outermost world in the solar system.',
    massRatioToSun: 5.150e-5,
    elements: {
      a: 30.06992276, aDot: 0.00026291,
      e: 0.00859048, eDot: 0.00005105,
      i: 1.77004347, iDot: 0.00035372,
      L: -55.12002969, LDot: 218.45945325,
      peri: 44.96476227, periDot: -0.32241464,
      node: 131.78422574, nodeDot: -0.00508664,
    },
  },
];
