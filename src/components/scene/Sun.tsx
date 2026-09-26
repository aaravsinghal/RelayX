'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUN_VISUAL_RADIUS_SCENE } from '@/lib/constants';

import { useMemo } from 'react';
import { getProceduralPlanetTexture } from '@/lib/planetTextures';

export default function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  const coronaRef1 = useRef<THREE.Mesh>(null);
  const coronaRef2 = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return getProceduralPlanetTexture('Sun');
  }, []);

  useFrame((state, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
    const pulse = Math.sin(state.clock.elapsedTime * 1.8) * 0.04;
    if (coronaRef1.current) coronaRef1.current.scale.setScalar(1.35 + pulse);
    if (coronaRef2.current) coronaRef2.current.scale.setScalar(1.75 - pulse * 0.5);
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 64, 64]} />
        <meshBasicMaterial map={texture || undefined} color={texture ? '#ffffff' : '#ffd27a'} />
      </mesh>
      {/* Dynamic solar corona layers */}
      <mesh ref={coronaRef1}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 32, 32]} />
        <meshBasicMaterial color="#ffaa22" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh ref={coronaRef2}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 32, 32]} />
        <meshBasicMaterial color="#ff5500" transparent opacity={0.10} depthWrite={false} />
      </mesh>
      {/* Solar exclusion zone wireframe */}
      <mesh scale={1.03}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 32, 32]} />
        <meshBasicMaterial color="#ff3b3b" wireframe transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <pointLight color="#fff8e7" intensity={1600} distance={0} decay={2} />
    </group>
  );
}
