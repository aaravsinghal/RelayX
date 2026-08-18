'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function addYears(d: Date, years: number) {
  const nd = new Date(d);
  nd.setFullYear(nd.getFullYear() + years);
  return nd;
}

export default function DateCalendar() {
  const date = useSimStore((s) => s.date);
  const setDate = useSimStore((s) => s.setDate);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(date.getFullYear());
  const [viewMonth, setViewMonth] = useState(date.getMonth());
  const [yearInput, setYearInput] = useState(String(date.getFullYear()));
  const containerRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!open) return;
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setYearInput(String(date.getFullYear()));
  }, [open, date]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const gridStart = new Date(viewYear, viewMonth, 1 - startWeekday);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m += 12;
      y -= 1;
    } else if (m > 11) {
      m -= 12;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const pickDay = (d: Date) => {
    const next = new Date(date);
    next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    setDate(next);
  };

  const jump = (years: number) => {
    const next = years === 0 ? new Date() : addYears(date, years);
    setDate(next);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  /** Keep the displayed grid in sync with the year box as soon as a complete
   * year is typed. Committing only on blur let the text field show one year
   * while the day grid was still rendering another -- so picking a day
   * silently returned a date in the wrong year. */
  const handleYearInput = (raw: string) => {
    if (!/^\d{0,4}$/.test(raw)) return;
    setYearInput(raw);
    const y = parseInt(raw, 10);
    if (raw.length === 4 && Number.isFinite(y) && y > 0) setViewYear(y);
  };

  const commitYearInput = () => {
    const y = parseInt(yearInput, 10);
    if (Number.isFinite(y) && y > 0 && y < 9999) {
      setViewYear(y);
      setYearInput(String(y));
    } else {
      setYearInput(String(viewYear));
    }
  };

  const dayCount = Math.round((date.getTime() - today.getTime()) / 86400000);
  const relativeLabel =
    dayCount === 0
      ? 'Today'
      : Math.abs(dayCount) < 60
        ? `${dayCount > 0 ? '+' : ''}${dayCount} d`
        : dayCount > 0
          ? `+${(dayCount / 365.25).toFixed(dayCount > 3650 ? 0 : 1)} yr`
          : `${(dayCount / 365.25).toFixed(dayCount < -3650 ? 0 : 1)} yr`;

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/50 px-5 py-3 backdrop-blur-xl shadow-2xl shadow-black/50 transition hover:border-white/20 hover:bg-black/60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-sky-400">
          <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 9.5h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="text-[11px] font-medium tracking-wide text-white/40">{relativeLabel}</span>
        <span className="text-sm font-semibold tabular-nums text-white/90">
          {MONTH_NAMES[date.getMonth()].slice(0, 3)} {date.getDate()}, {date.getFullYear()}
        </span>
        <svg
          width="11"
          height="11"
          viewBox="0 0 12 12"
          fill="none"
          className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="absolute bottom-[calc(100%+10px)] left-1/2 w-[300px] -translate-x-1/2 rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            {/* header */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                onClick={() => shiftMonth(-1)}
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white/90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-white/90">{MONTH_NAMES[viewMonth]}</span>
                <input
                  value={yearInput}
                  onChange={(e) => handleYearInput(e.target.value)}
                  onBlur={commitYearInput}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur(), commitYearInput())}
                  className="w-[52px] rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5 text-center text-[13px] font-semibold tabular-nums text-white/90 outline-none focus:border-sky-400/50"
                />
              </div>

              <button
                onClick={() => shiftMonth(1)}
                className="rounded-lg p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white/90"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* weekday labels */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="flex h-6 items-center justify-center text-[10px] font-medium text-white/30">
                  {w}
                </div>
              ))}
            </div>

            {/* day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === viewMonth;
                const isSelected = isSameDay(d, date);
                const isToday = isSameDay(d, today);
                return (
                  <button
                    key={i}
                    onClick={() => pickDay(d)}
                    className={`relative flex h-7 items-center justify-center rounded-md text-[11.5px] tabular-nums transition
                      ${isSelected ? 'bg-gradient-to-br from-sky-500 to-indigo-500 font-semibold text-white shadow-md shadow-sky-900/40' : ''}
                      ${!isSelected && inMonth ? 'text-white/75 hover:bg-white/10' : ''}
                      ${!isSelected && !inMonth ? 'text-white/20 hover:bg-white/5' : ''}
                    `}
                  >
                    {d.getDate()}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-sky-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* quick jump chips */}
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
              {[
                { label: 'Today', years: 0 },
                { label: '+1 yr', years: 1 },
                { label: '+10 yr', years: 10 },
                { label: '+50 yr', years: 50 },
                { label: '-1 yr', years: -1 },
                { label: '-10 yr', years: -10 },
                { label: '-50 yr', years: -50 },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => jump(chip.years)}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10.5px] text-white/60 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-sky-200"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
