'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';
import { askGemini } from '@/lib/gemini';
import { buildMonthlySchedule } from '@/lib/relayAlgorithm';
import { useAutoSolve } from '@/hooks/useAutoSolve';
import CoordinateInputPanel from '@/components/ui/CoordinateInputPanel';
import ResultsPanel from '@/components/ui/ResultsPanel';
import PlanetInfoCard from '@/components/ui/PlanetInfoCard';
import DateCalendar from '@/components/ui/DateCalendar';
import GeminiKeyModal from '@/components/ui/GeminiKeyModal';

import NasaTelemetryBar from '@/components/ui/NasaTelemetryBar';

const SceneCanvas = dynamic(() => import('@/components/scene/SceneCanvas'), { ssr: false });

export default function Home() {
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const geminiApiKey = useSimStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useSimStore((s) => s.setGeminiApiKey);
  const setGeminiExplanation = useSimStore((s) => s.setGeminiExplanation);
  const setGeminiLoading = useSimStore((s) => s.setGeminiLoading);
  const solution = useSimStore((s) => s.solution);
  const selectedPlanet = useSimStore((s) => s.selectedPlanet);
  const date = useSimStore((s) => s.date);

  useAutoSolve();

  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setGeminiApiKey(saved);
  }, [setGeminiApiKey]);

  useEffect(() => {
    if (geminiApiKey) localStorage.setItem('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  const handleAskGemini = async () => {
    if (!solution) return;
    if (!geminiApiKey) {
      setKeyModalOpen(true);
      return;
    }
    setGeminiLoading(true);
    setGeminiExplanation('');
    // use the exact coordinates the solution was computed for (the first/last
    // hop endpoints), not the live store points -- those may have since moved
    // if they're attached to a planet and the timeline was scrubbed afterward
    const solvedA = solution.hops[0].from;
    const solvedB = solution.hops[solution.hops.length - 1].to;
    const schedule = buildMonthlySchedule(solution, date);
    const scheduleText = schedule
      .map((m) => `${m.label}: ${m.status === 'direct' ? 'direct link' : `relay via ${m.relayLabel}`}`)
      .join('; ');

    const prompt = `You are a senior space-communications engineer briefing a mission team. Write a detailed but readable explanation (400-500 words, plain language, short paragraphs, no markdown headers) of why this interplanetary relay plan maintains uninterrupted communication all year.

DATA
Point A (heliocentric ecliptic, AU): (${solvedA.x.toFixed(4)}, ${solvedA.y.toFixed(4)}, ${solvedA.z.toFixed(4)})
Point B (heliocentric ecliptic, AU): (${solvedB.x.toFixed(4)}, ${solvedB.y.toFixed(4)}, ${solvedB.z.toFixed(4)})
Solution type: ${solution.type}${
      solution.type === 'conditional'
        ? ' -- the direct link is used for most of the year, with a temporary relay substituted in only during brief blackout windows'
        : ''
    }
Permanent relay(s) (if any): ${solution.relays.map((r) => r.label).join(', ') || 'none -- see the monthly schedule for any temporary relays'}
Direct/typical path length: ${solution.totalPathLengthAU.toFixed(4)} AU
Solver's own notes: ${solution.report.join(' ')}
Month-by-month schedule for the year ahead: ${scheduleText}

WHAT TO COVER
1. In plain terms, what is physically happening -- when and why the direct line of sight between A and B gets blocked (by the Sun's coronal plasma / exclusion zone, or by a planet passing through the line), referencing the specific month(s) from the schedule.
2. Why the chosen relay point(s) were picked: explain that L4/L5 Lagrange points are gravitationally stable (equilateral-triangle equilibrium with the Sun and a planet, stable because the Sun/planet mass ratio is below ~0.0385), so a satellite parked there needs no station-keeping fuel to stay on position indefinitely -- contrast this with why an unstable point (like L1/L2) would need constant thruster corrections.
3. If this is a conditional plan, explain concretely why switching to a relay only during the blackout window(s) is more efficient than running a relay permanently (fuel/cost/complexity of an idle relay most of the year), and reference the actual dates.
4. Comment on the practical implications: the light-travel delay, and roughly how a mission controller would operationalize this (e.g. pre-scheduling the handover before each blackout window).
Keep it precise and grounded in the numbers given -- do not invent data not present above.`;

    try {
      const text = await askGemini(geminiApiKey, prompt);
      setGeminiExplanation(text);
    } catch (e: any) {
      setGeminiExplanation(`Error: ${e.message}`);
    } finally {
      setGeminiLoading(false);
    }
  };

  const theme = useSimStore((s) => s.theme);
  const toggleTheme = useSimStore((s) => s.toggleTheme);
  const isLight = theme === 'light';

  return (
    <main className={`relative h-dvh w-full overflow-hidden transition-colors ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-black text-white'}`}>
      <div className="absolute inset-0">
        <SceneCanvas />
      </div>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-3"
        >
          <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 backdrop-blur-xl ${isLight ? 'border-slate-300 bg-white/80 shadow-md' : 'border-white/10 bg-black/50'}`}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_8px_2px_rgba(56,189,248,0.6)]" />
            <h1 className={`text-sm font-semibold tracking-wide ${isLight ? 'text-slate-900' : 'text-white/90'}`}>
              RELAY <span className={`font-normal ${isLight ? 'text-slate-500' : 'text-white/40'}`}>— comms path planner</span>
            </h1>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <NasaTelemetryBar />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto flex items-center gap-2"
        >
          <button
            onClick={toggleTheme}
            title="Toggle Light / Dark Mode"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium backdrop-blur-xl transition ${
              isLight
                ? 'border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 shadow-sm'
                : 'border-white/10 bg-black/50 text-white/80 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            {isLight ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <Link
            href="/calculations"
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium backdrop-blur-xl transition ${
              isLight
                ? 'border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 shadow-sm'
                : 'border-white/10 bg-black/50 text-white/80 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            View the math
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m0 0l-6-6m6 6l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <button
            onClick={() => setKeyModalOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium backdrop-blur-xl transition ${
              isLight
                ? 'border-slate-300 bg-white/90 text-slate-800 hover:bg-slate-100 shadow-sm'
                : 'border-white/10 bg-black/50 text-white/80 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${geminiApiKey ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            {geminiApiKey ? 'Gemini key set' : 'Set Gemini key'}
          </button>
        </motion.div>
      </div>

      {/* left panel */}
      <div className="pointer-events-none absolute left-4 top-20 bottom-4 z-10 flex flex-col">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="pointer-events-auto flex max-h-full flex-col gap-3 overflow-y-auto pr-1"
        >
          <CoordinateInputPanel />
        </motion.div>
      </div>

      {/* right panel */}
      <div className="pointer-events-none absolute right-4 top-20 bottom-4 z-10 flex flex-col items-end">
        <div className="pointer-events-auto flex max-h-full flex-col gap-3 overflow-y-auto pr-1">
          <AnimatePresence>
            {selectedPlanet && (
              <motion.div
                key="planet-card"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <PlanetInfoCard />
              </motion.div>
            )}
            {solution && (
              <motion.div
                key="results-panel"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <ResultsPanel onAskGemini={handleAskGemini} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* bottom timeline */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="pointer-events-auto"
        >
          <DateCalendar />
        </motion.div>
      </div>

      <GeminiKeyModal open={keyModalOpen} onClose={() => setKeyModalOpen(false)} />
    </main>
  );
}
