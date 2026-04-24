/**
 * Grid of dots arranged in rows × cols.
 *
 * Two uses:
 *   1. Multiplication array — "7 × 8" drawn as 7 rows of 8 dots (all filled).
 *   2. Fraction-of-quantity — 20 dots as 4 rows × 5 cols with 5 highlighted
 *      (one full row) to show "¼ of 20".
 *
 * Filled dots use the primary warm colour; un-highlighted dots are soft grey
 * outlines so the highlighted set reads as "these ones".
 */
import type { ReactNode } from 'react';

interface Props {
  rows:         number;
  cols:         number;
  highlighted?: number;
}

export function DotArray({ rows, cols, highlighted }: Props) {
  const total = rows * cols;
  const hi    = highlighted ?? total;          // default: all dots filled

  // Scale dot size down for dense arrays so the grid fits in the card.
  const maxDim   = Math.max(rows, cols);
  const dotR     = maxDim <= 6 ? 12 : maxDim <= 8 ? 10 : 8;
  const spacing  = dotR * 2.6;
  const pad      = dotR + 4;
  const W        = pad * 2 + spacing * (cols - 1);
  const H        = pad * 2 + spacing * (rows - 1);

  const dots: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx  = r * cols + c;
      const cx   = pad + c * spacing;
      const cy   = pad + r * spacing;
      const lit  = idx < hi;
      dots.push(
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={dotR}
          fill={lit ? '#FF9B7A' : '#FFF3E8'}
          stroke="#2D3047"
          strokeWidth="1.5"
        />,
      );
    }
  }

  return (
    <div className="flex items-center justify-center my-3">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>{dots}</svg>
    </div>
  );
}
