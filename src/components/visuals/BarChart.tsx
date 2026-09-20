/**
 * Bar chart — the דיאגרמות unit (numbers booklet, pp. 151–165).
 *
 * The chart IS the question, so it has to be readable: a value axis she can
 * count, the number printed on each bar, and a category name under it.
 *
 * RTL notes, both learned the hard way:
 *   - SVG <text> inherits dir=rtl from the page; every label sets its own
 *     text-anchor and direction rather than relying on inheritance.
 *   - Categories are laid out left-to-right in the drawing. That is fine for a
 *     chart (the axis is a number line), and it keeps the value labels aligned
 *     with the bars they belong to.
 */

const W = 300, H = 190;
const PAD_L = 26, PAD_B = 34, PAD_T = 18;

interface Props {
  title?:     string;
  categories: string[];
  values:     number[];
  unit?:      string;
}

export function BarChart({ title, categories, values }: Props) {
  const max      = Math.max(...values, 1);
  const step     = max <= 6 ? 1 : max <= 15 ? 2 : 5;
  const top      = Math.ceil(max / step) * step;
  const plotH    = H - PAD_B - PAD_T;
  const plotW    = W - PAD_L - 8;
  const slot     = plotW / categories.length;
  const barW     = Math.min(38, slot * 0.6);
  const y        = (v: number) => PAD_T + plotH - (v / top) * plotH;

  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <div className="my-3 flex justify-center">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 340 }} role="img"
           aria-label={title ?? 'דיאגרמת עמודות'}>
        {title && (
          <text x={W / 2} y={12} textAnchor="middle" direction="rtl"
                fontSize="11" fontWeight="700" fill="#2D3047">{title}</text>
        )}

        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD_L} y1={y(v)} x2={W - 8} y2={y(v)} stroke="#E5E0D8" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(v) + 3} textAnchor="end" direction="ltr"
                  fontSize="9" fill="#9A9384">{v}</text>
          </g>
        ))}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#2D3047" strokeWidth="1.5" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - 8} y2={PAD_T + plotH} stroke="#2D3047" strokeWidth="1.5" />

        {categories.map((cat, i) => {
          const cx = PAD_L + slot * (i + 0.5);
          const v  = values[i] ?? 0;
          return (
            <g key={cat}>
              <rect x={cx - barW / 2} y={y(v)} width={barW} height={PAD_T + plotH - y(v)}
                    rx="3" fill="#C4A7E7" />
              <text x={cx} y={y(v) - 4} textAnchor="middle" direction="ltr"
                    fontSize="10" fontWeight="700" fill="#2D3047">{v}</text>
              <text x={cx} y={PAD_T + plotH + 14} textAnchor="middle" direction="rtl"
                    fontSize="9.5" fill="#2D3047">{cat}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
