'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';

export default function GeminiKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const geminiApiKey = useSimStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useSimStore((s) => s.setGeminiApiKey);
  const [value, setValue] = useState(geminiApiKey);

  useEffect(() => setValue(geminiApiKey), [geminiApiKey, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-[min(420px,90vw)] rounded-2xl border border-white/10 bg-[#0a0a12] p-5 shadow-2xl"
          >
            <h3 className="text-sm font-semibold text-white/90">Gemini API key</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              Get a free key from{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline hover:text-sky-300"
              >
                Google AI Studio
              </a>
              . It is stored only in your browser (localStorage) and sent directly to our
              server-side proxy on request — never shared elsewhere.
            </p>
            <input
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="AIza…"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setGeminiApiKey(value.trim());
                  onClose();
                }
              }}
              className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white/90 outline-none transition focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGeminiApiKey(value.trim());
                  onClose();
                }}
                className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-3.5 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
