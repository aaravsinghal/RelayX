'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';
import { fetchNasaHorizonsTelemetry, NasaHorizonsTelemetry } from '@/lib/nasaHorizons';
import { PLANETS } from '@/lib/planetData';

export default function NasaTelemetryBar() {
  const ephemerisMode = useSimStore((s) => s.ephemerisMode);
  const setEphemerisMode = useSimStore((s) => s.setEphemerisMode);
  const selectedPlanet = useSimStore((s) => s.selectedPlanet);
  const date = useSimStore((s) => s.date);
  const [telemetry, setTelemetry] = useState<NasaHorizonsTelemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeTarget = selectedPlanet || 'Earth';

  useEffect(() => {
    if (ephemerisMode !== 'nasa-horizons') return;

    let cancel = false;
    setLoading(true);
    setError(null);

    fetchNasaHorizonsTelemetry(activeTarget, date)
      .then((res) => {
        if (!cancel) {
          setTelemetry(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancel) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancel = true;
    };
  }, [activeTarget, date, ephemerisMode]);

  return (
    <div className="pointer-events-auto flex flex-col items-center gap-2">
      {/* Mode Selector HUD Pill */}
      <div className="flex items-center gap-1 rounded-2xl border border-sky-500/20 bg-black/60 p-1 backdrop-blur-xl shadow-xl shadow-sky-950/30">
        <button
          onClick={() => setEphemerisMode('kepler')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
            ephemerisMode === 'kepler'
              ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30 shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          Analytical Keplerian
        </button>

        <button
          onClick={() => setEphemerisMode('nasa-horizons')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition ${
            ephemerisMode === 'nasa-horizons'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 shadow-sm'
              : 'text-white/40 hover:text-white/70'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-ping bg-emerald-400' : 'bg-emerald-400'}`} />
          NASA JPL Real-Time Horizons API
        </button>
      </div>

      {/* NASA Live Telemetry Data Box */}
      <AnimatePresence>
        {ephemerisMode === 'nasa-horizons' && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            className="w-[340px] rounded-xl border border-emerald-500/25 bg-[#050c0a]/90 p-3 backdrop-blur-2xl shadow-2xl shadow-emerald-950/40"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">
                  NASA TELEMETRY — {activeTarget}
                </span>
              </div>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono text-emerald-300">
                LIVE REST
              </span>
            </div>

            {loading ? (
              <div className="py-3 text-center text-xs text-emerald-300/60 animate-pulse">
                Fetching vectors from JPL Horizons SSD API…
              </div>
            ) : error ? (
              <div className="py-2 text-[10.5px] text-rose-400 leading-tight">{error}</div>
            ) : telemetry ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded bg-emerald-950/40 p-1.5 border border-emerald-500/10">
                  <span className="block text-[9px] text-emerald-300/50 uppercase">Sun Distance</span>
                  <span className="font-mono text-emerald-200 font-semibold">{telemetry.rangeAU.toFixed(4)} AU</span>
                </div>
                <div className="rounded bg-emerald-950/40 p-1.5 border border-emerald-500/10">
                  <span className="block text-[9px] text-emerald-300/50 uppercase">Helio Velocity</span>
                  <span className="font-mono text-emerald-200 font-semibold">{telemetry.velocityKmS.toFixed(2)} km/s</span>
                </div>
                <div className="rounded bg-emerald-950/40 p-1.5 border border-emerald-500/10">
                  <span className="block text-[9px] text-emerald-300/50 uppercase">1-Way Light Delay</span>
                  <span className="font-mono text-emerald-200 font-semibold">{telemetry.lightTimeSeconds.toFixed(1)} s</span>
                </div>
                <div className="rounded bg-emerald-950/40 p-1.5 border border-emerald-500/10">
                  <span className="block text-[9px] text-emerald-300/50 uppercase">Vector X / Y / Z</span>
                  <span className="font-mono text-[9.5px] text-emerald-200 truncate block">
                    {telemetry.positionAU.x.toFixed(2)}, {telemetry.positionAU.y.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
