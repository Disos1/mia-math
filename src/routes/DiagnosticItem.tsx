import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n/t';
import { MathText } from '../components/primitives/MathText';
import { AvatarBadge } from '../components/primitives/AvatarBadge';
import { VisualRenderer } from '../components/visuals/VisualRenderer';
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

          {/* Visual scaffold — fraction circles, analog clock, base-10 blocks,
              etc. Renders only for items that carry visual data; abstract
              items have visual: null and this is a no-op. */}
          <VisualRenderer visual={item.visual} />

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

