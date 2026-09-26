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
import AtmosphereGlow from './AtmosphereGlow';
import { getProceduralPlanetTexture, getProceduralRingTexture } from '@/lib/planetTextures';

const ATMOSPHERE_COLORS: Record<string, string> = {
  Earth: '#38bdf8',
  Mars: '#ef4444',
  Venus: '#fde047',
  Neptune: '#3b82f6',
  Uranus: '#06b6d4',
};

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

  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getProceduralPlanetTexture(planet.name);
  }, [planet.name]);

  const ringTexture = useMemo(() => {
    if (planet.name !== 'Saturn' && planet.name !== 'Uranus') return null;
    if (typeof window === 'undefined') return null;
    return getProceduralRingTexture();
  }, [planet.name]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (24 / Math.abs(planet.rotationPeriodHours)) * 0.4;
    }
  });

  const isSelected = selectedPlanet === planet.name;
  const moons = useMemo(() => moonsOf(planet.name), [planet.name]);
  const atmosphereColor = ATMOSPHERE_COLORS[planet.name];

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
        <sphereGeometry args={[planet.visualRadius, 64, 64]} />
        <meshStandardMaterial
          map={texture || undefined}
          color={texture ? '#ffffff' : planet.color}
          roughness={0.7}
          metalness={0.1}
          emissive={isSelected || hovered ? planet.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>

      {/* Realistic Atmospheric Limb Glow */}
      {atmosphereColor && (
        <AtmosphereGlow radius={planet.visualRadius} color={atmosphereColor} scale={1.12} power={2.2} />
      )}

      {/* Saturn's Procedural Rings */}
      {planet.name === 'Saturn' && (
        <mesh rotation={[Math.PI / 2.3, 0, 0]}>
          <ringGeometry args={[planet.visualRadius * 1.3, planet.visualRadius * 2.4, 128]} />
          <meshStandardMaterial
            map={ringTexture || undefined}
            color="#e3cf9a"
            transparent
            opacity={0.8}
            side={THREE.DoubleSide}
            roughness={0.5}
          />
        </mesh>
      )}

      {/* Target Reticle Indicator on Selection */}
      {isSelected && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[planet.visualRadius * 1.4, planet.visualRadius * 1.45, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {(hovered || isSelected) && (
        <Html distanceFactor={12} position={[0, planet.visualRadius + 0.6, 0]} occlude>
          <div className="pointer-events-none select-none rounded-md bg-black/80 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-white backdrop-blur-md whitespace-nowrap border border-sky-400/30 shadow-lg shadow-sky-950/40">
            {planet.name.toUpperCase()}
          </div>
        </Html>
      )}

      {moons.map((moon, i) => (
        <Moon key={moon.name} moon={moon} visualOrbitRadius={moonVisualOrbitRadius(planet.visualRadius, i)} />
      ))}
    </group>
  );
}
