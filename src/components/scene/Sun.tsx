'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SUN_VISUAL_RADIUS_SCENE } from '@/lib/constants';

export default function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 64, 64]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      {/* soft corona -- purely decorative, not used for occlusion */}
      <mesh scale={1.35}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 32, 32]} />
        <meshBasicMaterial color="#ff9d3a" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh scale={1.7}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 32, 32]} />
        <meshBasicMaterial color="#ff7a1a" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {/* thin rim marking the solar exclusion boundary the relay solver
          actually enforces -- sized to match this rendered sphere, so what
          you see is exactly what the solver keeps every path clear of */}
      <mesh scale={1.03}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS_SCENE, 24, 24]} />
        <meshBasicMaterial color="#ff3b3b" wireframe transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <pointLight color="#fff2d0" intensity={1200} distance={0} decay={2} />
    </group>
  );
}
