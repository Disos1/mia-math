/**
 * A number sequence as boxes, with the missing term as an empty box.
 *
 * Written after Dima photographed the screen on 2026-10-02: the sequence was
 * printed as text, "747,244, 757,244, 767,244, ___", and the comma separating
 * the terms is the same character as the comma inside each number. He read it
 * as six numbers, and so would a nine-year-old. No amount of spacing fixes
 * that; the separator has to stop being a comma at all.
 *
 * Boxes read right-to-left, first term on the right, matching the Hebrew
 * sentence above them. The digits inside each box stay left-to-right.
 */

const fmt = (n: number) => n.toLocaleString('en-US');

interface Props {
  terms: number[];
  /** Shown in the empty box at the end. */
  blankLabel?: string;
}

export function SequenceStrip({ terms, blankLabel = '?' }: Props) {
  return (
    <div className="my-3 flex flex-wrap items-center justify-center gap-2" dir="rtl">
      {terms.map((n, i) => (
        <div
          key={`${n}-${i}`}
          className="rounded-xl px-3 py-2 text-lg font-bold"
          style={{ background: '#F8F4ED', border: '2px solid #E5E0D8', color: '#2D3047',
                   direction: 'ltr', minWidth: 72, textAlign: 'center' }}
        >
          {fmt(n)}
        </div>
      ))}
      <div
        className="rounded-xl px-3 py-2 text-lg font-bold"
        style={{ background: '#F3EEFF', border: '2px dashed #C4A7E7', color: '#7C3AED',
                 direction: 'ltr', minWidth: 72, textAlign: 'center' }}
      >
        {blankLabel}
      </div>
    </div>
  );
}
