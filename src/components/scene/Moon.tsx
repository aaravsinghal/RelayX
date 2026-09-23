'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { MoonInfo, moonRelativeOffset } from '@/lib/moonData';
import { vecNormalize, sampleOrbitPath } from '@/lib/orbitalMechanics';
import { useSimStore } from '@/store/useSimStore';

/**
 * Moons are rendered at an artistically exaggerated orbital RADIUS around
 * their planet -- true orbital radii (a few thousand to a few million km)
 * would be sub-pixel or overlapping the planet at this scene scale, exactly
 * like true planet body sizes would be invisible around the Sun. The
 * DIRECTION (and therefore the phase/angle) is the real one, computed from
 * the moon's actual Keplerian elements, so it visibly orbits at the correct
 * relative speed and position -- only the distance is stretched for
 * legibility. The underlying coordinates used for solving/physics
 * (moonPositionAtDate) are never affected by this -- see relayAlgorithm.ts.
 */
export default function Moon({ moon, visualOrbitRadius }: { moon: MoonInfo; visualOrbitRadius: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const date = useSimStore((s) => s.date);
  const setSelectedPlanet = useSimStore((s) => s.setSelectedPlanet);
  const setFocus = useSimStore((s) => s.setFocus);
  const selectedPlanet = useSimStore((s) => s.selectedPlanet);

  const localPos = useMemo(() => {
    const rel = moonRelativeOffset(moon, date);
    const dir = vecNormalize(rel);
    return new THREE.Vector3(dir.x * visualOrbitRadius, dir.z * visualOrbitRadius, dir.y * visualOrbitRadius);
  }, [moon, date, visualOrbitRadius]);

  const ringPoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const samples = sampleOrbitPath(moon.elements, date, 64);
    for (const p of samples) {
      const dir = vecNormalize(p);
      pts.push([dir.x * visualOrbitRadius, dir.z * visualOrbitRadius, dir.y * visualOrbitRadius]);
    }
    return pts;
  }, [moon.elements, date, visualOrbitRadius]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.4;
  });

  const isSelected = selectedPlanet === moon.name;

  return (
    <group>
      <Line points={ringPoints} color={moon.color} lineWidth={0.4} transparent opacity={0.12} />
      <group position={localPos}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedPlanet(moon.name);
            setFocus({ type: 'planet', name: moon.name });
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[moon.visualRadius, 20, 20]} />
          <meshStandardMaterial
            color={moon.color}
            roughness={0.9}
            metalness={0.02}
            emissive={isSelected || hovered ? moon.color : '#000000'}
            emissiveIntensity={isSelected ? 0.4 : hovered ? 0.2 : 0}
          />
        </mesh>
        {(hovered || isSelected) && (
          <Html distanceFactor={10} position={[0, moon.visualRadius + 0.3, 0]} occlude>
            <div className="pointer-events-none select-none rounded-md bg-black/70 px-2 py-1 text-[10px] tracking-wide text-white/90 backdrop-blur-sm whitespace-nowrap border border-white/10">
              {moon.name}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}
