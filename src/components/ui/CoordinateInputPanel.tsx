'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore, effectivePosition, OrbitalLocation } from '@/store/useSimStore';
import { PLANETS } from '@/lib/planetData';
import { MOONS, moonsOf } from '@/lib/moonData';
import { resolveEndpointSpec } from '@/lib/relayAlgorithm';
import { lookupBuiltinOrbit, buildOrbitLookupPrompt, parseAiOrbitResponse } from '@/lib/orbitalLocations';
import { askGemini } from '@/lib/gemini';
import NumberField from './NumberField';

function AttachmentBadge({
  orbitalLocation,
  attachedPlanet,
  onDetach,
}: {
  orbitalLocation?: OrbitalLocation | null;
  attachedPlanet?: string | null;
  onDetach: () => void;
}) {
  if (orbitalLocation) {
    return (
      <div className="mb-2 rounded-md bg-violet-400/10 px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] text-violet-300">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
            {orbitalLocation.description}
            {orbitalLocation.source === 'ai' && (
              <span className="rounded-full bg-violet-400/20 px-1.5 py-[1px] text-[8.5px] font-medium text-violet-200">AI</span>
            )}
          </span>
          <button onClick={onDetach} className="text-[10px] text-violet-300/60 underline hover:text-violet-200">
            detach
          </button>
        </div>
        {(orbitalLocation.altitudeKm || orbitalLocation.notes) && (
          <p className="mt-1 text-[9.5px] leading-snug text-violet-200/50">
            {orbitalLocation.altitudeKm ? `≈${orbitalLocation.altitudeKm.toLocaleString()} km altitude. ` : ''}
            {orbitalLocation.notes || ''}
          </p>
        )}
      </div>
    );
  }
  if (attachedPlanet) {
    return (
      <div className="mb-2 flex items-center justify-between rounded-md bg-sky-400/10 px-2 py-1">
        <span className="flex items-center gap-1.5 text-[10px] text-sky-300">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path
              d="M13.5 6.5l4 4-7 7-4-4 7-7zM9 15l-4.5 4.5M15 3l6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          tracking {attachedPlanet} live
        </span>
        <button onClick={onDetach} className="text-[10px] text-sky-300/60 underline hover:text-sky-200">
          detach
        </button>
      </div>
    );
  }
  return null;
}

function CoordRow({
  label,
  color,
  x,
  y,
  z,
  attachedPlanet,
  orbitalLocation,
  syncToken,
  onChange,
  onPickPlanet,
  onDetach,
  onLocateOrbit,
  locating,
  locateError,
  onPlaceSettlement,
}: {
  label: string;
  color: string;
  x: number;
  y: number;
  z: number;
  attachedPlanet?: string | null;
  orbitalLocation?: OrbitalLocation | null;
  syncToken: string;
  onChange: (axis: 'x' | 'y' | 'z', v: number) => void;
  onPickPlanet: (name: string) => void;
  onDetach: () => void;
  onLocateOrbit: (query: string) => void;
  locating: boolean;
  locateError: string | null;
  onPlaceSettlement: (bodyName: string, latDeg: number, lonDeg: number) => void;
}) {
  const [orbitQuery, setOrbitQuery] = useState('');
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementBody, setSettlementBody] = useState('Mars');
  const [settlementLat, setSettlementLat] = useState('0');
  const [settlementLon, setSettlementLon] = useState('0');

  return (
    <div className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full ring-4"
            style={{ background: color, boxShadow: `0 0 8px ${color}`, ['--tw-ring-color' as any]: `${color}22` }}
          />
          <span className="text-[12.5px] font-medium tracking-wide text-white/80">{label}</span>
        </div>
        <div className="relative">
          <select
            className="cursor-pointer appearance-none rounded-md border border-white/10 bg-white/5 py-1 pl-2 pr-6 text-[10.5px] text-white/60 outline-none transition hover:border-white/20 hover:bg-white/10 hover:text-white/90"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) onPickPlanet(e.target.value);
              e.target.value = '';
            }}
          >
            <option value="" disabled>
              snap to planet or moon…
            </option>
            <optgroup label="Planets">
              {PLANETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            {PLANETS.filter((p) => moonsOf(p.name).length > 0).map((p) => (
              <optgroup key={p.name} label={`${p.name}'s moons`}>
                {moonsOf(p.name).map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-white/40"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <AttachmentBadge orbitalLocation={orbitalLocation} attachedPlanet={attachedPlanet} onDetach={onDetach} />

      <div className="mb-2 flex items-center gap-1.5">
        <input
          value={orbitQuery}
          onChange={(e) => setOrbitQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && orbitQuery.trim()) onLocateOrbit(orbitQuery.trim());
          }}
          placeholder="orbit, e.g. Low Mars Orbit, Aldrin Cycler…"
          className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-[11px] text-white/85 outline-none transition placeholder:text-white/25 focus:border-violet-400/50 focus:bg-black/60 focus:ring-1 focus:ring-violet-400/30"
        />
        <button
          onClick={() => orbitQuery.trim() && onLocateOrbit(orbitQuery.trim())}
          disabled={locating || !orbitQuery.trim()}
          title="Locate this orbit"
          className="flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 p-1.5 text-white/60 transition hover:border-violet-400/40 hover:bg-violet-400/10 hover:text-violet-200 disabled:opacity-40"
        >
          {locating ? (
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
      {locateError && <p className="mb-2 text-[10px] leading-snug text-rose-400">{locateError}</p>}

      <button
        onClick={() => setSettlementOpen((v) => !v)}
        className="mb-2 flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70"
      >
        <svg
          className={`h-2 w-2 transition-transform ${settlementOpen ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        place a fixed surface settlement (lat/lon)
      </button>

      <AnimatePresence initial={false}>
        {settlementOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="space-y-1.5 rounded-md border border-white/10 bg-black/30 p-2">
              <select
                value={settlementBody}
                onChange={(e) => setSettlementBody(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80 outline-none"
              >
                <optgroup label="Planets">
                  {PLANETS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                {PLANETS.filter((p) => moonsOf(p.name).length > 0).map((p) => (
                  <optgroup key={p.name} label={`${p.name}'s moons`}>
                    {moonsOf(p.name).map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-white/25">LAT</span>
                  <input
                    value={settlementLat}
                    onChange={(e) => /^-?\d{0,3}(\.\d*)?$/.test(e.target.value) && setSettlementLat(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 py-1 pl-8 pr-2 text-[11px] text-white/85 outline-none"
                  />
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9px] text-white/25">LON</span>
                  <input
                    value={settlementLon}
                    onChange={(e) => /^-?\d{0,3}(\.\d*)?$/.test(e.target.value) && setSettlementLon(e.target.value)}
                    className="w-full rounded-md border border-white/10 bg-black/40 py-1 pl-8 pr-2 text-[11px] text-white/85 outline-none"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  const lat = Math.max(-90, Math.min(90, parseFloat(settlementLat) || 0));
                  const lon = parseFloat(settlementLon) || 0;
                  onPlaceSettlement(settlementBody, lat, lon);
                  setSettlementOpen(false);
                }}
                className="w-full rounded-md bg-gradient-to-r from-amber-500/80 to-orange-500/80 py-1.5 text-[11px] font-medium text-white transition hover:brightness-110"
              >
                Place settlement
              </button>
              <p className="text-[9px] leading-snug text-white/25">
                Lat -90 to 90, lon any degrees. The settlement rotates with {settlementBody} — line-of-sight depends
                on which way it's facing, not just conjunctions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-1.5">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <div key={axis} className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[9.5px] font-medium text-white/25">
              {axis.toUpperCase()}
            </span>
            <NumberField
              axisLabel={`${label} ${axis}`}
              value={axis === 'x' ? x : axis === 'y' ? y : z}
              syncToken={syncToken}
              onCommit={(v) => onChange(axis, v)}
              className={`w-full rounded-md border border-white/10 bg-black/40 py-1.5 pl-6 pr-2 text-xs tabular-nums text-white/90 outline-none transition focus:border-sky-400/50 focus:bg-black/60 focus:ring-1 focus:ring-sky-400/30 ${
                attachedPlanet || orbitalLocation ? 'opacity-70' : ''
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CoordinateInputPanel() {
  const pointA = useSimStore((s) => s.pointA);
  const pointB = useSimStore((s) => s.pointB);
  const setPointA = useSimStore((s) => s.setPointA);
  const setPointB = useSimStore((s) => s.setPointB);
  const date = useSimStore((s) => s.date);
  const solving = useSimStore((s) => s.solving);
  const setFocus = useSimStore((s) => s.setFocus);
  const solution = useSimStore((s) => s.solution);
  const geminiApiKey = useSimStore((s) => s.geminiApiKey);
  const [manualA, setManualA] = useState(0);
  const [manualB, setManualB] = useState(0);
  const [locatingA, setLocatingA] = useState(false);
  const [locatingB, setLocatingB] = useState(false);
  const [locateErrorA, setLocateErrorA] = useState<string | null>(null);
  const [locateErrorB, setLocateErrorB] = useState<string | null>(null);

  const posAForCheck = effectivePosition(pointA, date);
  const posBForCheck = effectivePosition(pointB, date);
  const samePoint =
    Math.hypot(posAForCheck.x - posBForCheck.x, posAForCheck.y - posBForCheck.y, posAForCheck.z - posBForCheck.z) < 0.001;

  const snap = (name: string, which: 'A' | 'B') => {
    const isPlanet = PLANETS.some((p) => p.name === name);
    const isMoon = MOONS.some((m) => m.name === name);
    if (!isPlanet && !isMoon) return;
    const spec = isPlanet ? ({ kind: 'planet', planetName: name } as const) : ({ kind: 'moon', moonName: name } as const);
    const pos = resolveEndpointSpec(spec, date);
    const setter = which === 'A' ? setPointA : setPointB;
    setter({ label: name, x: pos.x, y: pos.y, z: pos.z, attachedPlanet: name, orbitalLocation: null });
  };

  const detach = (which: 'A' | 'B') => {
    const point = which === 'A' ? pointA : pointB;
    const pos = effectivePosition(point, date);
    const setter = which === 'A' ? setPointA : setPointB;
    setter({ x: pos.x, y: pos.y, z: pos.z, attachedPlanet: null, orbitalLocation: null });
    if (which === 'A') setManualA((v) => v + 1);
    else setManualB((v) => v + 1);
  };

  const editAxis = (which: 'A' | 'B', axis: 'x' | 'y' | 'z', v: number) => {
    const setter = which === 'A' ? setPointA : setPointB;
    setter({ [axis]: v, attachedPlanet: null, orbitalLocation: null });
  };

  const locateOrbit = async (which: 'A' | 'B', query: string) => {
    const setLocating = which === 'A' ? setLocatingA : setLocatingB;
    const setError = which === 'A' ? setLocateErrorA : setLocateErrorB;
    const setter = which === 'A' ? setPointA : setPointB;

    setError(null);
    setLocating(true);
    try {
      let resolved = lookupBuiltinOrbit(query);
      if (!resolved) {
        if (!geminiApiKey) {
          setError('Not a known preset. Set a Gemini key (top-right) to look up custom orbits with AI.');
          return;
        }
        const text = await askGemini(geminiApiKey, buildOrbitLookupPrompt(query));
        const result = parseAiOrbitResponse(text, query);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        resolved = result;
      }
      const pos = resolveEndpointSpec(resolved.spec, date);
      setter({ label: resolved.description, x: pos.x, y: pos.y, z: pos.z, attachedPlanet: null, orbitalLocation: resolved });
      if (which === 'A') setManualA((v) => v + 1);
      else setManualB((v) => v + 1);
    } catch (e: any) {
      setError(e?.message ?? 'Lookup failed.');
    } finally {
      setLocating(false);
    }
  };

  const placeSettlement = (which: 'A' | 'B', bodyName: string, latDeg: number, lonDeg: number) => {
    const spec = { kind: 'surface' as const, bodyName, latDeg, lonDeg };
    const pos = resolveEndpointSpec(spec, date);
    const latLabel = `${Math.abs(latDeg).toFixed(1)}°${latDeg >= 0 ? 'N' : 'S'}`;
    const lonLabel = `${Math.abs(((lonDeg % 360) + 360) % 360).toFixed(1)}°E`;
    const description = `Settlement at ${latLabel}, ${lonLabel} on ${bodyName}`;
    const setter = which === 'A' ? setPointA : setPointB;
    setter({
      label: description,
      x: pos.x,
      y: pos.y,
      z: pos.z,
      attachedPlanet: null,
      orbitalLocation: {
        description,
        source: 'builtin',
        spec,
        notes: "Fixed to the surface -- line-of-sight depends on the body's rotation carrying it in and out of view, not just conjunctions.",
      },
    });
    if (which === 'A') setManualA((v) => v + 1);
    else setManualB((v) => v + 1);
  };

  const swap = () => {
    const a = { ...pointA };
    const b = { ...pointB };
    setPointA({ label: b.label, x: b.x, y: b.y, z: b.z, attachedPlanet: b.attachedPlanet ?? null, orbitalLocation: b.orbitalLocation ?? null });
    setPointB({ label: a.label, x: a.x, y: a.y, z: a.z, attachedPlanet: a.attachedPlanet ?? null, orbitalLocation: a.orbitalLocation ?? null });
    setManualA((v) => v + 1);
    setManualB((v) => v + 1);
  };

  const posA = effectivePosition(pointA, date);
  const posB = effectivePosition(pointB, date);
  const attachKeyA = pointA.orbitalLocation?.description ?? pointA.attachedPlanet;
  const attachKeyB = pointB.orbitalLocation?.description ?? pointB.attachedPlanet;
  const syncA = attachKeyA ? `${attachKeyA}@${date.getTime()}` : `manual@${manualA}`;
  const syncB = attachKeyB ? `${attachKeyB}@${date.getTime()}` : `manual@${manualB}`;

  return (
    <div className="w-[300px] rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold tracking-wide text-white/90">
          Communication Endpoints
        </h2>
        <button
          onClick={swap}
          title="Swap A and B"
          className="flex items-center gap-1 rounded-md border border-white/10 px-1.5 py-1 text-[10px] text-white/50 transition hover:border-white/20 hover:bg-white/5 hover:text-white/80"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M7 7h13l-3-3M17 17H4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          swap
        </button>
      </div>

      <div className="space-y-3">
        <CoordRow
          label={pointA.label || 'Point A'}
          color="#4ade80"
          x={posA.x}
          y={posA.y}
          z={posA.z}
          attachedPlanet={pointA.attachedPlanet}
          orbitalLocation={pointA.orbitalLocation}
          syncToken={syncA}
          onChange={(axis, v) => editAxis('A', axis, v)}
          onPickPlanet={(n) => snap(n, 'A')}
          onDetach={() => detach('A')}
          onLocateOrbit={(q) => locateOrbit('A', q)}
          locating={locatingA}
          locateError={locateErrorA}
          onPlaceSettlement={(bodyName, lat, lon) => placeSettlement('A', bodyName, lat, lon)}
        />
        <CoordRow
          label={pointB.label || 'Point B'}
          color="#f472b6"
          x={posB.x}
          y={posB.y}
          z={posB.z}
          attachedPlanet={pointB.attachedPlanet}
          orbitalLocation={pointB.orbitalLocation}
          syncToken={syncB}
          onChange={(axis, v) => editAxis('B', axis, v)}
          onPickPlanet={(n) => snap(n, 'B')}
          onDetach={() => detach('B')}
          onLocateOrbit={(q) => locateOrbit('B', q)}
          locating={locatingB}
          locateError={locateErrorB}
          onPlaceSettlement={(bodyName, lat, lon) => placeSettlement('B', bodyName, lat, lon)}
        />
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed text-white/35">
        Coordinates are heliocentric ecliptic (AU) — X/Y lie in the ecliptic plane, Z is
        above/below it. Snap to a planet or moon, type an orbital location (Low Mars Orbit,
        Earth-Sun L2, Aldrin Cycler…), or edit X/Y/Z directly — all three track live and
        recalculate automatically as time moves.
      </p>

      <AnimatePresence>
        {samePoint && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 text-[11px] text-rose-400"
          >
            Points A and B are the same location — move one to see a relay path.
          </motion.p>
        )}
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-white/40">
        <svg
          className={`h-3 w-3 ${solving ? 'animate-spin text-sky-400' : 'text-emerald-400'}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          {solving ? (
            <>
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
        {solving ? 'Recalculating…' : 'Up to date'}
      </div>

      <AnimatePresence>
        {solution && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onClick={() => setFocus({ type: 'solution' })}
            className="mt-2 w-full rounded-lg border border-white/15 py-1.5 text-xs text-white/70 transition hover:bg-white/5"
          >
            Focus on solution
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
