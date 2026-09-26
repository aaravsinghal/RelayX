import { OrbitalElements, AU_KM } from './planetData';
import { Vec3, planetPositionAtDate } from './orbitalMechanics';

export interface AsteroidInfo {
  name: string;
  color: string;
  radiusKm: number;
  visualRadius: number;
  description: string;
  elements: OrbitalElements;
}

/**
 * Major asteroids and dwarf planets that can occlude radio signals or serve as
 * targets / obstructions in interplanetary space.
 */
export const ASTEROIDS: AsteroidInfo[] = [
  {
    name: 'Ceres',
    color: '#a39e93',
    radiusKm: 473,
    visualRadius: 0.1,
    description: 'Largest object in the main asteroid belt and the only dwarf planet in the inner solar system.',
    elements: {
      a: 2.767, aDot: 0,
      e: 0.0758, eDot: 0,
      i: 10.593, iDot: 0,
      L: 153.2, LDot: 21406,
      peri: 73.0, periDot: 0,
      node: 80.3, nodeDot: 0,
    },
  },
  {
    name: 'Vesta',
    color: '#bfae9b',
    radiusKm: 262.7,
    visualRadius: 0.08,
    description: 'Second-most massive body in the asteroid belt, with a giant impact crater at its south pole.',
    elements: {
      a: 2.361, aDot: 0,
      e: 0.0887, eDot: 0,
      i: 7.14, iDot: 0,
      L: 104.2, LDot: 27120,
      peri: 150.6, periDot: 0,
      node: 103.8, nodeDot: 0,
    },
  },
  {
    name: 'Pallas',
    color: '#8c857b',
    radiusKm: 256,
    visualRadius: 0.08,
    description: 'Third-largest asteroid, featuring a highly inclined orbit of nearly 35 degrees.',
    elements: {
      a: 2.772, aDot: 0,
      e: 0.231, eDot: 0,
      i: 34.84, iDot: 0,
      L: 310.4, LDot: 21330,
      peri: 310.2, periDot: 0,
      node: 173.1, nodeDot: 0,
    },
  },
  {
    name: 'Pluto',
    color: '#d6c4b2',
    radiusKm: 1188.3,
    visualRadius: 0.12,
    description: 'Dwarf planet in the Kuiper belt, featuring a heart-shaped nitrogen ice glacier.',
    elements: {
      a: 39.482, aDot: 0,
      e: 0.2488, eDot: 0,
      i: 17.16, iDot: 0,
      L: 238.9, LDot: 145.2,
      peri: 224.1, periDot: 0,
      node: 110.3, nodeDot: 0,
    },
  },
];

export function asteroidPositionAtDate(asteroid: AsteroidInfo, date: Date): Vec3 {
  return planetPositionAtDate(asteroid.elements, date);
}

/** Main Asteroid Belt parameters for 3D visual particle ring & belt occlusion check */
export const MAIN_BELT_INNER_AU = 2.1;
export const MAIN_BELT_OUTER_AU = 3.3;
export const KUPER_BELT_INNER_AU = 30.0;
export const KUIPER_BELT_OUTER_AU = 50.0;
