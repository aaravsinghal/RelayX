'use client';

import { useEffect, useRef } from 'react';
import { useSimStore, effectivePosition, pointToEndpointSpec } from '@/store/useSimStore';
import { solveRelayPath } from '@/lib/relayAlgorithm';

const DEBOUNCE_MS = 350;

/**
 * Keeps the relay solution continuously in sync with the current endpoints
 * and timeline date -- no "Solve" button. Any change to point A, point B, or
 * the date (including planets revolving as the timeline is scrubbed)
 * schedules a recompute a short debounce after the last change, so typing a
 * coordinate digit-by-digit or dragging the timeline doesn't re-run the
 * solver on every intermediate frame.
 */
export function useAutoSolve() {
  const pointA = useSimStore((s) => s.pointA);
  const pointB = useSimStore((s) => s.pointB);
  const date = useSimStore((s) => s.date);
  const solution = useSimStore((s) => s.solution);
  const setSolution = useSimStore((s) => s.setSolution);
  const setSolving = useSimStore((s) => s.setSolving);
  const setFocus = useSimStore((s) => s.setFocus);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hadSolutionRef = useRef(false);

  useEffect(() => {
    hadSolutionRef.current = solution != null;
  }, [solution]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSolving(true);

    timerRef.current = setTimeout(() => {
      const a = effectivePosition(pointA, date);
      const b = effectivePosition(pointB, date);
      const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

      if (dist < 0.001) {
        setSolution(null);
        setSolving(false);
        return;
      }

      const sol = solveRelayPath(pointToEndpointSpec(pointA), pointToEndpointSpec(pointB), date);
      setSolution(sol);
      setSolving(false);
      // auto-frame the camera the first time a solution appears, but never
      // yank the view around on every subsequent recompute while the user
      // is mid-edit or scrubbing the timeline
      if (!hadSolutionRef.current) setFocus({ type: 'solution' });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointA, pointB, date]);
}
