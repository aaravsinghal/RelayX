'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import SolarSystem from './SolarSystem';
import CameraRig from './CameraRig';

import { useSimStore } from '@/store/useSimStore';

export default function SceneCanvas() {
  const theme = useSimStore((s) => s.theme);
  const isLight = theme === 'light';

  return (
    <Canvas
      camera={{ position: [30, 22, 34], fov: 45, near: 0.01, far: 5000 }}
      gl={{ antialias: true }}
      dpr={[1, 1.75]}
    >
      <color attach="background" args={[isLight ? '#f1f5f9' : '#020207']} />
      <ambientLight intensity={isLight ? 0.45 : 0.12} />
      <directionalLight position={[0, 10, 0]} intensity={isLight ? 0.3 : 0.08} color="#a5f3fc" />
      <Suspense fallback={null}>
        <Stars radius={500} depth={100} count={isLight ? 3000 : 8000} factor={4} saturation={0.1} fade speed={0.5} />
        <SolarSystem />
      </Suspense>
      <CameraRig />
      <EffectComposer multisampling={0}>
        <Bloom intensity={isLight ? 0.35 : 0.65} luminanceThreshold={isLight ? 0.5 : 0.25} luminanceSmoothing={0.9} mipmapBlur />
        {!isLight && <Vignette eskil={false} offset={0.15} darkness={0.85} />}
      </EffectComposer>
    </Canvas>
  );
}
