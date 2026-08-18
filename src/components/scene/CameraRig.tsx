'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore, coordPointToVec } from '@/store/useSimStore';
import { PLANETS } from '@/lib/planetData';
import { MOONS, moonsOf, moonVisualOrbitRadius, moonRelativeOffset } from '@/lib/moonData';
import { planetPositionAtDate, vecNormalize } from '@/lib/orbitalMechanics';
import { auToScene } from '@/lib/constants';

export default function CameraRig() {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const focus = useSimStore((s) => s.focus);
  const date = useSimStore((s) => s.date);
  const solution = useSimStore((s) => s.solution);
  const pointA = useSimStore((s) => s.pointA);
  const pointB = useSimStore((s) => s.pointB);

  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetCam = useRef(new THREE.Vector3(30, 22, 34));
  const animating = useRef(false);

  useEffect(() => {
    if (focus.type === 'planet') {
      const planet = PLANETS.find((p) => p.name === focus.name);
      if (planet) {
        const p = planetPositionAtDate(planet.elements, date);
        const scenePos = new THREE.Vector3(auToScene(p.x), auToScene(p.z), auToScene(p.y));
        targetPos.current.copy(scenePos);
        const dist = Math.max(planet.visualRadius * 8, 3);
        targetCam.current.copy(scenePos).add(new THREE.Vector3(dist, dist * 0.6, dist));
        animating.current = true;
      } else {
        const moon = MOONS.find((m) => m.name === focus.name);
        const parent = moon ? PLANETS.find((p) => p.name === moon.parentPlanet) : undefined;
        if (moon && parent) {
          const parentP = planetPositionAtDate(parent.elements, date);
          const parentScenePos = new THREE.Vector3(auToScene(parentP.x), auToScene(parentP.z), auToScene(parentP.y));
          const idx = moonsOf(parent.name).findIndex((m) => m.name === moon.name);
          const orbitRadius = moonVisualOrbitRadius(parent.visualRadius, idx);
          const dir = vecNormalize(moonRelativeOffset(moon, date));
          const localOffset = new THREE.Vector3(dir.x * orbitRadius, dir.z * orbitRadius, dir.y * orbitRadius);
          const scenePos = parentScenePos.add(localOffset);
          targetPos.current.copy(scenePos);
          const dist = Math.max(moon.visualRadius * 10, 1.2);
          targetCam.current.copy(scenePos).add(new THREE.Vector3(dist, dist * 0.6, dist));
          animating.current = true;
        }
      }
    } else if (focus.type === 'solution' && solution) {
      const av = coordPointToVec(pointA);
      const bv = coordPointToVec(pointB);
      const pts = [av, bv, ...solution.relays.map((r) => r.position)];
      const box = new THREE.Box3();
      pts.forEach((v) => box.expandByPoint(new THREE.Vector3(auToScene(v.x), auToScene(v.z), auToScene(v.y))));
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.length() * 0.7, 15);
      targetPos.current.copy(center);
      targetCam.current
        .copy(center)
        .add(new THREE.Vector3(radius * 0.7, radius * 0.55, radius * 0.7));
      animating.current = true;
    } else {
      targetPos.current.set(0, 0, 0);
      targetCam.current.set(30, 22, 34);
      animating.current = true;
    }
  }, [focus, solution, date, pointA, pointB]);

  useFrame(() => {
    if (!animating.current || !controlsRef.current) return;
    const controls = controlsRef.current;
    controls.target.lerp(targetPos.current, 0.06);
    camera.position.lerp(targetCam.current, 0.06);
    controls.update();
    if (camera.position.distanceTo(targetCam.current) < 0.05) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={800}
      zoomSpeed={0.9}
      rotateSpeed={0.5}
    />
  );
}
