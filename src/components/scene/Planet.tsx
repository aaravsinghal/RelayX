'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetInfo } from '@/lib/planetData';
import { moonsOf, moonVisualOrbitRadius } from '@/lib/moonData';
import { planetPositionAtDate } from '@/lib/orbitalMechanics';
import { auToScene } from '@/lib/constants';
import { useSimStore } from '@/store/useSimStore';
import Moon from './Moon';

export default function Planet({ planet }: { planet: PlanetInfo }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const date = useSimStore((s) => s.date);
  const setSelectedPlanet = useSimStore((s) => s.setSelectedPlanet);
  const setFocus = useSimStore((s) => s.setFocus);
  const selectedPlanet = useSimStore((s) => s.selectedPlanet);

  const position = useMemo(() => {
    const p = planetPositionAtDate(planet.elements, date);
    return new THREE.Vector3(auToScene(p.x), auToScene(p.z), auToScene(p.y));
  }, [planet.elements, date]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (24 / Math.abs(planet.rotationPeriodHours)) * 0.6;
    }
  });

  const isSelected = selectedPlanet === planet.name;

  const moons = useMemo(() => moonsOf(planet.name), [planet.name]);

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        rotation={[0, 0, (planet.tilt * Math.PI) / 180]}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPlanet(planet.name);
          setFocus({ type: 'planet', name: planet.name });
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[planet.visualRadius, 48, 48]} />
        <meshStandardMaterial
          color={planet.color}
          roughness={0.85}
          metalness={0.05}
          emissive={isSelected || hovered ? planet.color : '#000000'}
          emissiveIntensity={isSelected ? 0.35 : hovered ? 0.18 : 0}
        />
      </mesh>

      {planet.name === 'Saturn' && (
        <mesh rotation={[Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[planet.visualRadius * 1.3, planet.visualRadius * 2.2, 64]} />
          <meshBasicMaterial color="#d8c9a0" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      )}

      {(hovered || isSelected) && (
        <Html distanceFactor={12} position={[0, planet.visualRadius + 0.6, 0]} occlude>
          <div className="pointer-events-none select-none rounded-md bg-black/70 px-2 py-1 text-[11px] tracking-wide text-white/90 backdrop-blur-sm whitespace-nowrap border border-white/10">
            {planet.name}
          </div>
        </Html>
      )}

      {moons.map((moon, i) => (
        <Moon key={moon.name} moon={moon} visualOrbitRadius={moonVisualOrbitRadius(planet.visualRadius, i)} />
      ))}
    </group>
  );
}
