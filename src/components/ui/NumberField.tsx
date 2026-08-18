'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A numeric input that keeps its own raw text while the user is typing, so
 * intermediate states like "-", "-3.", or "" are not clobbered by re-parsing
 * on every keystroke (which previously made it impossible to type a leading
 * minus sign). The committed numeric value is pushed upstream only once the
 * text parses to a finite number; the field re-syncs from `value` whenever
 * it changes for a reason other than this field's own typing (e.g. a
 * "snap to planet" action), tracked via the `syncToken`.
 */
export default function NumberField({
  value,
  onCommit,
  syncToken,
  axisLabel,
  className = '',
}: {
  value: number;
  onCommit: (v: number) => void;
  syncToken: string | number;
  axisLabel: string;
  className?: string;
}) {
  const [text, setText] = useState(() => trimNum(value));
  const lastSync = useRef(syncToken);
  const focused = useRef(false);

  useEffect(() => {
    if (lastSync.current !== syncToken) {
      lastSync.current = syncToken;
      if (!focused.current) setText(trimNum(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncToken, value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={axisLabel}
      value={text}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        const raw = e.target.value;
        // allow the user to type freely: digits, one leading minus, one dot
        if (!/^-?\d*\.?\d*$/.test(raw)) return;
        setText(raw);
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed)) onCommit(parsed);
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = parseFloat(text);
        if (Number.isFinite(parsed)) {
          setText(trimNum(parsed));
          onCommit(parsed);
        } else {
          setText(trimNum(value));
        }
      }}
      className={className}
    />
  );
}

function trimNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const s = n.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return s === '' || s === '-0' ? '0' : s;
}
