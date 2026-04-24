import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n/t';
import { MathText } from '../components/primitives/MathText';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import type { Avatar, DiagnosticItem as DiagnosticItemType } from '../types';

interface Props {
  avatar: Avatar;
  item: DiagnosticItemType;
  index: number;
  total: number;
  onAnswer: (answer: string | number, timeToAnswerMs: number) => void;
}

/**
 * DiagnosticItem — renders one diagnostic item.
 *
 * CRITICAL: This component MUST receive key={item.itemId} at every call site.
 * React reuses component instances when the same type renders consecutively.
 * Without a key change, `selected` and `locked` state bleeds from item N into
 * item N+1, making the new item appear frozen on first tap.
 *
 * Every render site: <DiagnosticItem key={item.itemId} item={item} ... />
 */
export function DiagnosticItem({ avatar, item, index, total, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | number | null>(null);
  const [locked, setLocked]     = useState(false);
  const mountedAt = useRef(Date.now());
  const [options] = useState(() => [...item.options].sort(() => Math.random() - 0.5));

  // Reset the mount timestamp whenever the item changes (key-driven remount ensures this)
  useEffect(() => { mountedAt.current = Date.now(); }, []);

  const handleTap = (option: string | number) => {
    if (locked) return;
    const elapsed = Date.now() - mountedAt.current;
    setSelected(option);
    setLocked(true);
    // 1100 ms feedback window — brief colour, no text, no sound
    setTimeout(() => onAnswer(option, elapsed), 1100);
  };

  const optionBg = (opt: string | number): string => {
    if (!locked || selected !== opt) return '#F5EFE6';
    return opt === item.correct ? '#B8E5C9' : '#FFCFC9';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 fade-in">
      <div className="w-full max-w-md flex flex-col gap-5">

        {/* Header: progress label + avatar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 font-medium">
            {t('diag_item.progress', { gender: 'f' as const, current: index + 1, total })}
          </span>
          <AvatarBadge avatar={avatar} size="sm" />
        </div>

        {/* Progress bar — colour only, no right/wrong indicators */}
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full"
              style={{
                background:
                  i < index ? '#C4A7E7' : i === index ? '#FF9B7A' : '#E5E0D8',
              }}
            />
          ))}
        </div>

        {/* Question card */}
        <div className="bg-white card-shadow rounded-3xl p-6 mt-4">
          <div className="text-2xl leading-relaxed font-medium mb-5">
            <MathText>{item.question}</MathText>
          </div>

          {/* Fraction circle visual (Phase 1: static SVG placeholder) */}
          {item.visual?.type === 'fraction_circles' && (
            <div className="flex items-center justify-around my-4">
              <FractionCircle
                parts={item.visual.partsA}
                label={item.visual.labelA}
              />
              <FractionCircle
                parts={item.visual.partsB}
                label={item.visual.labelB}
              />
            </div>
          )}

          {/* Options grid — 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {options.map(opt => (
              <button
                key={String(opt)}
                onClick={() => handleTap(opt)}
                disabled={locked}
                className={`btn-shadow rounded-2xl py-4 text-2xl font-bold transition-colors
                  ${locked && selected === opt ? 'bounce' : ''}`}
                style={{ background: optionBg(opt) }}
              >
                <MathText>{String(opt)}</MathText>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline fraction-circle visual ────────────────────────────────────────────

function FractionCircle({ parts, label }: { parts: number; label: string }) {
  const r = 50, cx = 60, cy = 60;
  const slices = Array.from({ length: parts }, (_, i) => {
    const a0 = (i * 2 * Math.PI) / parts - Math.PI / 2;
    const a1 = ((i + 1) * 2 * Math.PI) / parts - Math.PI / 2;
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={i === 0 ? '#FF9B7A' : '#FFE8DD'}
        stroke="#2D3047"
        strokeWidth="2"
      />
    );
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="120" viewBox="0 0 120 120">{slices}</svg>
      <div className="text-2xl font-bold">{label}</div>
    </div>
  );
}
