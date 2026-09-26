'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { auToScene } from '@/lib/constants';
import { MAIN_BELT_INNER_AU, MAIN_BELT_OUTER_AU } from '@/lib/asteroidData';

export default function AsteroidBelt() {
  const count = 3500;

  const [positions, colors] = useMemo(() => {
    const posArr = new Float32Array(count * 3);
    const colArr = new Float32Array(count * 3);

    const minR = auToScene(MAIN_BELT_INNER_AU);
    const maxR = auToScene(MAIN_BELT_OUTER_AU);

    const baseColor = new THREE.Color('#94a3b8');
    const altColor = new THREE.Color('#cbd5e1');

    for (let i = 0; i < count; i++) {
      const radius = minR + Math.random() * (maxR - minR);
      const theta = Math.random() * Math.PI * 2;
      // Slight vertical scattering around ecliptic
      const height = (Math.random() - 0.5) * (radius * 0.08);

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
      const y = height;

      posArr[i * 3] = x;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = z;

      const mix = Math.random();
      const c = baseColor.clone().lerp(altColor, mix);
      colArr[i * 3] = c.r;
      colArr[i * 3 + 1] = c.g;
      colArr[i * 3 + 2] = c.b;
    }

    return [posArr, colArr];
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.12} vertexColors transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}
