'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

const FresnelShader = {
  uniforms: {
    color: { value: new THREE.Color('#38bdf8') },
    power: { value: 2.5 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float power;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      float intensity = pow(1.0 - abs(dot(normal, viewDir)), power);
      gl_FragColor = vec4(color, intensity * 0.7);
    }
  `,
};

export default function AtmosphereGlow({
  radius,
  color,
  scale = 1.15,
  power = 2.4,
}: {
  radius: number;
  color: string;
  scale?: number;
  power?: number;
}) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(color) },
        power: { value: power },
      },
      vertexShader: FresnelShader.vertexShader,
      fragmentShader: FresnelShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
    });
  }, [color, power]);

  return (
    <mesh scale={scale}>
      <sphereGeometry args={[radius, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
