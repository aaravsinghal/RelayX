'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import SolarSystem from './SolarSystem';
import CameraRig from './CameraRig';

export default function SceneCanvas() {
  return (
    <Canvas
      camera={{ position: [30, 22, 34], fov: 45, near: 0.01, far: 5000 }}
      gl={{ antialias: true }}
      dpr={[1, 1.75]}
    >
      <color attach="background" args={['#020207']} />
      <ambientLight intensity={0.06} />
      <Suspense fallback={null}>
        <Stars radius={400} depth={80} count={6000} factor={3} saturation={0} fade speed={0.4} />
        <SolarSystem />
      </Suspense>
      <CameraRig />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.55} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.15} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
