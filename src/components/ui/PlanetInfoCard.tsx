'use client';

import { useSimStore } from '@/store/useSimStore';
import { PLANETS } from '@/lib/planetData';
import { MOONS, moonPositionAtDate } from '@/lib/moonData';
import { planetPositionAtDate, vecLength, vecSub } from '@/lib/orbitalMechanics';

export default function PlanetInfoCard() {
  const selectedPlanet = useSimStore((s) => s.selectedPlanet);
  const setSelectedPlanet = useSimStore((s) => s.setSelectedPlanet);
  const setFocus = useSimStore((s) => s.setFocus);
  const date = useSimStore((s) => s.date);

  const planet = PLANETS.find((p) => p.name === selectedPlanet);
  const moon = !planet ? MOONS.find((m) => m.name === selectedPlanet) : undefined;
  if (!planet && !moon) return null;

  const close = () => {
    setSelectedPlanet(null);
    setFocus({ type: 'none' });
  };

  if (planet) {
    const pos = planetPositionAtDate(planet.elements, date);
    const distFromSun = vecLength(pos);
    return (
      <div className="w-[280px] rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: planet.color }} />
            <h3 className="text-sm font-semibold text-white/90">{planet.name}</h3>
          </div>
          <button onClick={close} className="text-white/40 hover:text-white/80">
            ✕
          </button>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-white/50">{planet.description}</p>
        <div className="mt-3 space-y-1 text-xs text-white/70">
          <div className="flex justify-between">
            <span className="text-white/40">Distance from Sun</span>
            <span>{distFromSun.toFixed(3)} AU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Radius</span>
            <span>{planet.radiusKm.toLocaleString()} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Orbital eccentricity</span>
            <span>{planet.elements.e.toFixed(4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/40">Inclination</span>
            <span>{planet.elements.i.toFixed(2)}°</span>
          </div>
        </div>
      </div>
    );
  }

  // moon
  const parent = PLANETS.find((p) => p.name === moon!.parentPlanet);
  const moonPos = moonPositionAtDate(moon!, date);
  const distFromSun = vecLength(moonPos);
  const distFromPlanet = parent ? vecLength(vecSub(moonPos, planetPositionAtDate(parent.elements, date))) * 149_597_870.7 : null;

  return (
    <div className="w-[280px] rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: moon!.color }} />
          <h3 className="text-sm font-semibold text-white/90">{moon!.name}</h3>
          <span className="rounded-full bg-white/10 px-1.5 py-[1px] text-[9px] text-white/50">moon of {moon!.parentPlanet}</span>
        </div>
        <button onClick={close} className="text-white/40 hover:text-white/80">
          ✕
        </button>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-white/50">{moon!.description}</p>
      <div className="mt-3 space-y-1 text-xs text-white/70">
        <div className="flex justify-between">
          <span className="text-white/40">Distance from {moon!.parentPlanet}</span>
          <span>{distFromPlanet ? Math.round(distFromPlanet).toLocaleString() : '—'} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Distance from Sun</span>
          <span>{distFromSun.toFixed(3)} AU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Radius</span>
          <span>{moon!.radiusKm.toLocaleString()} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Orbital eccentricity</span>
          <span>{moon!.elements.e.toFixed(4)}</span>
        </div>
      </div>
      <p className="mt-2 text-[9.5px] leading-snug text-white/25">
        Rendered close to {moon!.parentPlanet} at an exaggerated visual distance for legibility — real
        orbital distances are used for all calculations.
      </p>
    </div>
  );
}
