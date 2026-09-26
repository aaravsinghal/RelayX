'use client';

import { Suspense, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';

function CustomModel({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  return <primitive object={scene} scale={1} position={[0, 0, 0]} />;
}

export default function GLTFModelLoader() {
  const [modelPath, setModelPath] = useState<string | null>(null);

  useEffect(() => {
    // Check if custom user GLTF / GLB model exists in /models/
    const candidates = ['/models/solarsystem.glb', '/models/solarsystem.gltf'];
    let found = false;
    for (const url of candidates) {
      fetch(url, { method: 'HEAD' })
        .then((res) => {
          if (res.ok && !found) {
            found = true;
            setModelPath(url);
          }
        })
        .catch(() => {});
    }
  }, []);

  if (!modelPath) return null;

  return (
    <Suspense fallback={null}>
      <CustomModel modelUrl={modelPath} />
    </Suspense>
  );
}
