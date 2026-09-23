'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';
import { lightDelaySeconds, buildMonthlySchedule } from '@/lib/relayAlgorithm';
import { AU_KM } from '@/lib/planetData';

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  return `${(seconds / 3600).toFixed(2)} hr`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ResultsPanel({ onAskGemini }: { onAskGemini: () => void }) {
  const solution = useSimStore((s) => s.solution);
  const geminiLoading = useSimStore((s) => s.geminiLoading);
  const geminiExplanation = useSimStore((s) => s.geminiExplanation);
  const date = useSimStore((s) => s.date);
  const setDate = useSimStore((s) => s.setDate);
  const setFocus = useSimStore((s) => s.setFocus);
  const [scheduleOpen, setScheduleOpen] = useState(true);

  if (!solution) return null;

  const isConditional = solution.type === 'conditional';
  const delay = lightDelaySeconds(solution.totalPathLengthAU);
  const schedule = buildMonthlySchedule(solution, date);

  const jumpToDate = (d: Date) => {
    setDate(d);
    setFocus({ type: 'solution' });
  };

  /** The blackout window the displayed date currently falls inside, if any --
   * drives the "relay live right now" banner so the panel agrees with what
   * the 3D scene is drawing. */
  const activeWindow = isConditional
    ? solution.conditionalWindows?.find((w) => date.getTime() >= w.startDate.getTime() && date.getTime() <= w.endDate.getTime())
    : undefined;

  const badgeText = solution.rotationLimited
    ? 'Rotation-limited'
    : isConditional
      ? `Direct + seasonal relay`
      : solution.type === 'direct'
        ? 'Direct link'
        : solution.type === 'single-relay'
          ? '1 relay'
          : '2 relays';

  const badgeClass = solution.rotationLimited
    ? 'bg-orange-500/20 text-orange-300'
    : isConditional
      ? 'bg-violet-500/20 text-violet-300'
      : solution.type === 'direct'
        ? 'bg-sky-500/20 text-sky-300'
        : 'bg-amber-500/20 text-amber-300';

  return (
    <div className="w-[300px] rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-white/90">Relay Solution</h2>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeClass}`}>{badgeText}</span>
      </div>

      {activeWindow && (
        <div
          onClick={() => jumpToDate(new Date((activeWindow.startDate.getTime() + activeWindow.endDate.getTime()) / 2))}
          className="mb-2.5 cursor-pointer rounded-lg border border-violet-400/40 bg-violet-500/15 p-2.5 transition hover:bg-violet-500/25"
          title="Click to jump to window midpoint"
        >
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-violet-100">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300 shadow-[0_0_6px_2px_rgba(196,181,253,0.7)]" />
            Relay live right now
          </p>
          <p className="mt-1 text-[10.5px] leading-snug text-violet-200/70">
            On this date the direct link is blocked by {activeWindow.blockingBodies.join(', ') || 'occlusion'} — traffic is
            routing via <strong className="text-violet-100">{activeWindow.relays.map((r) => r.label).join(' + ')}</strong>{' '}
            until {formatDate(activeWindow.endDate)}.
          </p>
        </div>
      )}

      {solution.rotationLimited && (
        <div className="mb-2.5 rounded-lg border border-orange-400/30 bg-orange-500/[0.08] p-2.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-orange-200">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3a9 9 0 1 0 9 9M12 3v5h5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Fixed settlement — day/night cycle
          </p>
          <p className="mt-1 text-[10.5px] leading-snug text-orange-100/70">
            {solution.rotationLimited.bodyName}'s own rotation (~{solution.rotationLimited.periodDays.toFixed(2)} day period)
            carries the settlement's local horizon in and out of view of the target —{' '}
            <strong className="text-orange-100">~{solution.rotationLimited.dutyCyclePercent.toFixed(0)}%</strong> direct duty
            cycle. No single heliocentric relay can fully cover this; the one below is the best available compromise. See
            the notes below for why.
          </p>
        </div>
      )}

      {isConditional && (
        <p className="mb-2 text-[11px] leading-relaxed text-violet-200/80">
          Direct line-of-sight works for <strong className="text-violet-100">
            ~{Math.round((solution.directClearFraction ?? 0) * 100)}%
          </strong>{' '}
          of the year. A relay is only needed during the brief window(s) below.
        </p>
      )}

      <div className="space-y-1.5 text-xs text-white/70">
        <div className="flex justify-between">
          <span className="text-white/40">{isConditional ? 'Path length (direct)' : 'Path length'}</span>
          <span>{solution.totalPathLengthAU.toFixed(3)} AU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">Distance</span>
          <span>{(solution.totalPathLengthAU * AU_KM).toLocaleString(undefined, { maximumFractionDigits: 0 })} km</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/40">One-way light delay</span>
          <span>{formatDelay(delay)}</span>
        </div>
      </div>

      {isConditional && solution.conditionalWindows && (
        <div className="mt-3 space-y-2">
          {solution.conditionalWindows.map((w, i) => {
            const wDelay = lightDelaySeconds(w.pathLengthAU);
            const isActive = w === activeWindow;
            const midDate = new Date((w.startDate.getTime() + w.endDate.getTime()) / 2);
            return (
              <div
                key={i}
                onClick={() => jumpToDate(midDate)}
                className={`cursor-pointer rounded-lg border p-2.5 transition hover:brightness-110 ${
                  isActive ? 'border-violet-400/50 bg-violet-500/[0.12]' : 'border-amber-400/25 bg-amber-500/[0.07]'
                }`}
                title="Click to jump timeline to this blackout window"
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[11.5px] font-semibold ${isActive ? 'text-violet-100' : 'text-amber-200'}`}>
                    {isActive ? 'Active now: ' : 'Relay required: '}
                    {formatDate(w.startDate)} – {formatDate(w.endDate)}
                  </p>
                  <span className="text-[9.5px] text-violet-300/60 underline">jump →</span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-amber-100/60">
                  Blocked by {w.blockingBodies.join(', ') || 'occlusion'} — switches to{' '}
                  {w.relays.map((r) => r.label).join(' + ')} ({w.pathLengthAU.toFixed(3)} AU,{' '}
                  {formatDelay(wDelay)} delay)
                </p>
              </div>
            );
          })}
        </div>
      )}

      {!isConditional && solution.relays.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] font-medium text-white/50">Relay stations</p>
          {solution.relays.map((r) => (
            <div key={r.id} className="rounded-md bg-white/5 px-2.5 py-1.5">
              <div className="flex items-center gap-2 text-[11px] text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]" />
                {r.label}
                <span className="text-white/30">(stable Lagrange point)</span>
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 pl-3.5 text-[10px] tabular-nums text-white/45">
                <span>X {r.position.x.toFixed(4)}</span>
                <span>Y {r.position.y.toFixed(4)}</span>
                <span>Z {r.position.z.toFixed(4)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-2.5">
        <button
          onClick={() => setScheduleOpen((v) => !v)}
          className="flex w-full items-center justify-between text-[11px] font-medium text-white/50 hover:text-white/70"
        >
          <span>Monthly relay schedule (next 12 months)</span>
          <svg
            className={`h-2.5 w-2.5 transition-transform ${scheduleOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 12 12"
            fill="none"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
        <AnimatePresence initial={false}>
          {scheduleOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pr-1">
                {schedule.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => jumpToDate(m.monthStart)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 text-[10.5px] transition hover:bg-white/10 ${
                      m.status === 'relay' ? 'bg-violet-500/10' : ''
                    }`}
                    title={`Jump timeline to ${m.label}`}
                  >
                    <span className="shrink-0 text-white/50">{m.label}</span>
                    {m.status === 'relay' ? (
                      <span className="text-right">
                        <strong className="font-semibold text-violet-200">Relay: {m.relayLabel}</strong>
                        {m.partial && (
                          <span className="block text-[9.5px] font-normal text-violet-300/50">
                            only {m.relayFromDay}–{m.relayToDay}, rest direct
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-white/35">Direct link</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
        {solution.report.map((line, i) => (
          <p key={i} className="text-[10.5px] leading-relaxed text-white/40">
            {line}
          </p>
        ))}
        <p className="text-[10px] leading-relaxed text-white/25">
          Planets use their true physical radii for clearance. The Sun uses a wider
          plasma-avoidance margin sized to match its rendered disk, so a path is guaranteed to
          stay visibly clear of it too — see the math page for details.
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onAskGemini}
        disabled={geminiLoading}
        className="mt-3 w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {geminiLoading ? 'Asking Gemini…' : '✨ Explain with Gemini AI'}
      </motion.button>

      <AnimatePresence>
        {geminiExplanation && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 max-h-40 overflow-y-auto text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap"
          >
            {geminiExplanation}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
