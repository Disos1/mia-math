/**
 * NumPad — RTL-safe numeric keypad for constructed-response answers.
 *
 * The single highest-leverage anti-guessing surface in the app: a typed
 * answer can't be picked from four options, so a correct answer is evidence
 * of computation, not of elimination or luck.
 *
 * Design constraints (PRD §8.9): 48pt+ touch targets, digits rendered LTR
 * inside the RTL page (MathText), no timer, no penalty for slow typing.
 */

import { useState } from 'react';
import { MathText } from './MathText';

/** Floor for the pad width; grade-3 answers never exceed this. */
const DEFAULT_MAX_DIGITS = 4;

interface Props {
  /** Called with the typed number when the learner taps ✓. */
  onSubmit:    (value: number) => void;
  disabled?:   boolean;
  maxLength?:  number;
  /** Placeholder glyph shown while the entry is empty. */
  placeholder?: string;
}

const KEYS: ReadonlyArray<ReadonlyArray<string>> = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['⌫', '0', '✓'],
];

/**
 * Digits the pad must accept for a given expected answer.
 *
 * Derived, never hardcoded: a fixed cap silently makes items unanswerable the
 * moment content grows. On 2026-07-31 the pad was pinned at 4 while a grade-4
 * item asked for 200,030 — Mia typed "2000" and could not continue.
 *
 * One digit of headroom is deliberate. Some misconceptions produce a LONGER
 * numeral than the answer (writing 1,000,000 as more zeros than it needs), and
 * she must be able to enter a wrong answer in order for it to be diagnosed.
 */
export function digitsNeededFor(answer: string | number | undefined): number {
  if (answer === undefined || answer === null) return DEFAULT_MAX_DIGITS;
  const digits = String(answer).replace(/[^0-9]/g, '').length;
  return Math.max(DEFAULT_MAX_DIGITS, digits + 1);
}

export function NumPad({ onSubmit, disabled = false, maxLength = DEFAULT_MAX_DIGITS, placeholder = '?' }: Props) {
  const [value, setValue] = useState('');

  const tap = (key: string) => {
    if (disabled) return;
    if (key === '⌫') { setValue(v => v.slice(0, -1)); return; }
    if (key === '✓') {
      if (value.length === 0) return;
      onSubmit(Number(value));
      return;
    }
    setValue(v => (v.length >= maxLength ? v : v === '0' ? key : v + key));
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Entry display — LTR isolate so digits read naturally inside RTL */}
      <div
        className="bg-[#F5EFE6] rounded-2xl px-8 py-3 min-w-[9rem] text-center text-3xl font-black tracking-widest"
        style={{ color: value ? '#2D3047' : '#C9C2B6', minHeight: '3.5rem' }}
        aria-live="polite"
      >
        <MathText>{value || placeholder}</MathText>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full max-w-[16rem]" dir="ltr">
        {KEYS.flat().map(key => {
          const isSubmit = key === '✓';
          const isDelete = key === '⌫';
          const submitReady = isSubmit && value.length > 0 && !disabled;
          return (
            <button
              key={key}
              onClick={() => tap(key)}
              disabled={disabled || (isSubmit && value.length === 0)}
              className="btn-shadow rounded-2xl py-3.5 text-2xl font-bold transition-colors"
              style={{
                background: submitReady ? '#B8E5C9' : isSubmit ? '#EDE8DF' : isDelete ? '#FFE5DE' : '#F5EFE6',
                color:      submitReady ? '#166534' : '#2D3047',
                opacity:    disabled ? 0.5 : 1,
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
