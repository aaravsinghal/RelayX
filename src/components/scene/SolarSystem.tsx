'use client';

import { PLANETS } from '@/lib/planetData';
import { useSimStore } from '@/store/useSimStore';
import Sun from './Sun';
import Planet from './Planet';
import OrbitLine from './OrbitLine';
import RelayPath from './RelayPath';

import AsteroidBelt from './AsteroidBelt';
import GLTFModelLoader from './GLTFModelLoader';

export default function SolarSystem() {
  const date = useSimStore((s) => s.date);

  return (
    <group>
      <Sun />
      <AsteroidBelt />
      <GLTFModelLoader />
      {PLANETS.map((planet) => (
        <group key={planet.name}>
          <OrbitLine elements={planet.elements} date={date} color={planet.color} />
          <Planet planet={planet} />
        </group>
      ))}
      <RelayPath />
    </group>
  );
}
