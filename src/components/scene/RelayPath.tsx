'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useSimStore, effectivePosition, CoordPoint } from '@/store/useSimStore';
import { auToScene } from '@/lib/constants';
import { Vec3, sampleOrbitPath } from '@/lib/orbitalMechanics';
import { LagrangeCandidate, resolveEndpointSpec, staticHeliocentricElements } from '@/lib/relayAlgorithm';

function toScene(v: Vec3): [number, number, number] {
  return [auToScene(v.x), auToScene(v.z), auToScene(v.y)];
}

/**
 * A relay candidate's stored `position` is a snapshot from when the
 * candidate list was built (the solve date). Every line/marker in the scene
 * must be drawn at the CURRENTLY displayed date instead, or the relay
 * geometry detaches from the A/B markers and the path visibly flies off to
 * nowhere as soon as the timeline is scrubbed.
 */
function relayPositionAt(relay: LagrangeCandidate, date: Date): Vec3 {
  return resolveEndpointSpec({ kind: 'lagrange', planetName: relay.planet, point: relay.point }, date);
}

function Marker({
  position,
  color,
  label,
  size = 0.22,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  size?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2.4) * 0.12;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <octahedronGeometry args={[size, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 2.2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <Html distanceFactor={12} position={[0, size + 0.5, 0]} occlude>
        <div className="pointer-events-none select-none rounded-md bg-black/75 px-2 py-1 text-[11px] text-white/90 backdrop-blur-sm whitespace-nowrap border border-white/10">
          {label}
        </div>
      </Html>
    </group>
  );
}

function AnimatedLink({
  from,
  to,
  color,
  opacity = 0.85,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  opacity?: number;
}) {
  const points = useMemo(() => [from, to], [from, to]);
  const dashRef = useRef<any>(null);
  useFrame((_, delta) => {
    if (dashRef.current) {
      dashRef.current.material.dashOffset -= delta * 0.6;
    }
  });
  return (
    <>
      <Line points={points} color={color} lineWidth={2} transparent opacity={opacity} />
      <Line
        ref={dashRef}
        points={points}
        color="#ffffff"
        lineWidth={1.5}
        dashed
        dashScale={8}
        dashSize={0.6}
        gapSize={1.4}
        transparent
        opacity={opacity}
      />
    </>
  );
}

/** A static, non-animated line -- used for the "blocked" direct link so it
 * reads as inactive rather than carrying signal. */
function BlockedLink({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = useMemo(() => [from, to], [from, to]);
  return <Line points={points} color="#f87171" lineWidth={1.2} dashed dashScale={6} dashSize={0.4} gapSize={0.9} transparent opacity={0.3} />;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * The full ellipse of a free heliocentric endpoint (a cycler trajectory, an
 * AI-identified orbit, ...) -- so selecting one shows where it actually goes
 * over a full period, not just a single dot at today's position. Distinct
 * from the always-on faint planet orbit lines: this pulses and sits above
 * them so the selected endpoint's path reads as "the thing you picked."
 */
function HighlightedOrbit({ a, e, i, color, date }: { a: number; e: number; i: number; color: string; date: Date }) {
  const points = useMemo(() => {
    const elements = staticHeliocentricElements(a, e, i);
    return sampleOrbitPath(elements, date, 240).map(
      (p) => [auToScene(p.x), auToScene(p.z), auToScene(p.y)] as [number, number, number]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, e, i]);
  const glowRef = useRef<any>(null);
  useFrame((state) => {
    if (glowRef.current) {
      glowRef.current.material.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });
  return (
    <>
      <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.75} />
      <Line ref={glowRef} points={points} color={color} lineWidth={4} transparent opacity={0.35} depthWrite={false} />
    </>
  );
}

/** Render the highlighted full orbit for an endpoint, if it's a free
 * heliocentric orbital location (a cycler etc). Planet/moon/Lagrange
 * endpoints already have their orbits drawn elsewhere (or don't have a
 * separate one to show), so this only applies to that one spec kind. */
function EndpointOrbit({ point, color, date }: { point: CoordPoint; color: string; date: Date }) {
  const spec = point.orbitalLocation?.spec;
  if (!spec || spec.kind !== 'heliocentric') return null;
  return <HighlightedOrbit a={spec.a} e={spec.e} i={spec.i} color={color} date={date} />;
}

export default function RelayPath() {
  const pointA = useSimStore((s) => s.pointA);
  const pointB = useSimStore((s) => s.pointB);
  const solution = useSimStore((s) => s.solution);
  const date = useSimStore((s) => s.date);

  const aVec = effectivePosition(pointA, date);
  const bVec = effectivePosition(pointB, date);
  const aPos = toScene(aVec);
  const bPos = toScene(bVec);

  /** The conditional window the currently displayed date falls inside, if any. */
  const activeWindow = useMemo(() => {
    if (solution?.type !== 'conditional' || !solution.conditionalWindows?.length) return null;
    const t = date.getTime();
    return solution.conditionalWindows.find((w) => t >= w.startDate.getTime() && t <= w.endDate.getTime()) ?? null;
  }, [solution, date]);

  /** The soonest window still ahead of the current date (only previewed when
   * no window is currently active). */
  const nextWindow = useMemo(() => {
    if (solution?.type !== 'conditional' || !solution.conditionalWindows?.length) return null;
    if (activeWindow) return null;
    const upcoming = solution.conditionalWindows.filter((w) => w.startDate.getTime() > date.getTime());
    if (!upcoming.length) return null;
    return upcoming.reduce((soonest, w) => (w.startDate.getTime() < soonest.startDate.getTime() ? w : soonest), upcoming[0]);
  }, [solution, date, activeWindow]);

  const isConditional = solution?.type === 'conditional';

  return (
    <group>
      <EndpointOrbit point={pointA} color="#4ade80" date={date} />
      <EndpointOrbit point={pointB} color="#f472b6" date={date} />

      <Marker position={aPos} color="#4ade80" label={pointA.label || 'Point A'} />
      <Marker position={bPos} color="#f472b6" label={pointB.label || 'Point B'} />

      {/* direct A->B link: live (blue) most of the year, drawn as a dim
          "blocked" line while a blackout window is active */}
      {isConditional &&
        (activeWindow ? <BlockedLink from={aPos} to={bPos} /> : <AnimatedLink from={aPos} to={bPos} color="#38bdf8" />)}
      {solution?.type === 'direct' && <AnimatedLink from={aPos} to={bPos} color="#38bdf8" />}

      {/* permanent relay chain (single/dual relay solutions), re-resolved at
          the current date so it stays attached to the A/B markers */}
      {solution && (solution.type === 'single-relay' || solution.type === 'dual-relay') && (
        <group>
          {(() => {
            const relayPts = solution.relays.map((r) => relayPositionAt(r, date));
            const chain = [aVec, ...relayPts, bVec];
            return chain.slice(0, -1).map((from, i) => (
              <AnimatedLink key={i} from={toScene(from)} to={toScene(chain[i + 1])} color="#facc15" />
            ));
          })()}
          {solution.relays.map((relay) => (
            <Marker
              key={relay.id}
              position={toScene(relayPositionAt(relay, date))}
              color="#facc15"
              label={`Relay: ${relay.label}`}
              size={0.16}
            />
          ))}
        </group>
      )}

      {/* ACTIVE seasonal relay -- the current date is inside a blackout
          window, so this is the path actually carrying traffic right now.
          All geometry is resolved at the current date, so it connects the
          real A/B markers rather than a stale mid-window snapshot. */}
      {activeWindow && (
        <group>
          {(() => {
            const relayPts = activeWindow.relays.map((r) => relayPositionAt(r, date));
            const chain = [aVec, ...relayPts, bVec];
            return chain.slice(0, -1).map((from, i) => (
              <AnimatedLink key={i} from={toScene(from)} to={toScene(chain[i + 1])} color="#a78bfa" />
            ));
          })()}
          {activeWindow.relays.map((relay) => (
            <Marker
              key={relay.id}
              position={toScene(relayPositionAt(relay, date))}
              color="#a78bfa"
              label={`Relay ACTIVE now (until ${formatShortDate(activeWindow.endDate)}): ${relay.label}`}
              size={0.18}
            />
          ))}
        </group>
      )}

      {/* upcoming seasonal relay -- a faint preview of where the relay will
          be stationed, marker only (no lines), since drawing a full inactive
          path alongside the live direct link just reads as clutter. */}
      {nextWindow &&
        nextWindow.relays.map((relay) => (
          <Marker
            key={relay.id}
            position={toScene(relayPositionAt(relay, date))}
            color="#7c6ba8"
            label={`Relay needed ${formatShortDate(nextWindow.startDate)}–${formatShortDate(nextWindow.endDate)}: ${relay.label}`}
            size={0.12}
          />
        ))}
    </group>
  );
}
