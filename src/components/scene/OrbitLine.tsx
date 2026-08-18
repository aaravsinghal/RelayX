'use client';

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { OrbitalElements } from '@/lib/planetData';
import { sampleOrbitPath } from '@/lib/orbitalMechanics';
import { auToScene } from '@/lib/constants';

export default function OrbitLine({
  elements,
  date,
  color,
}: {
  elements: OrbitalElements;
  date: Date;
  color: string;
}) {
  const points = useMemo(() => {
    return sampleOrbitPath(elements, date, 200).map(
      (p) => [auToScene(p.x), auToScene(p.z), auToScene(p.y)] as [number, number, number]
    );
    // date intentionally coarse -- orbit shape barely changes year to year
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements]);

  return <Line points={points} color={color} lineWidth={0.6} transparent opacity={0.35} />;
}
