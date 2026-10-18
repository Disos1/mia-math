/**
 * Bar chart — the דיאגרמות unit (numbers booklet, topic 14).
 *
 * The chart IS the question, so it has to be readable: a value axis she can
 * count, the number printed on each bar, and a category name under it. The
 * plan asks for two things beyond a single series of small numbers, both now
 * supported: values in the thousands and millions (labels use thousands
 * separators), and a double bar chart — two series side by side with a legend.
 *
 * RTL notes, both learned the hard way:
 *   - SVG <text> inherits dir=rtl from the page; every label sets its own
 *     text-anchor and direction rather than relying on inheritance.
 *   - Categories are laid out left-to-right in the drawing. That is fine for a
 *     chart (the axis is a number line), and it keeps the value labels aligned
 *     with the bars they belong to.
 */

const W = 300, H = 200;
const PAD_B = 34, PAD_T = 22;
const COLORS = ['#C4A7E7', '#FF9B7A'];

const fmt = (n: number) => n.toLocaleString('en-US');

interface Props {
  title?:     string;
  categories: string[];
  values:     number[];
  /** Second series for a double bar chart. */
  values2?:   number[];
  /** Names of the two series, shown as a legend. */
  legend?:    [string, string];
  unit?:      string;
}

/** A tick step that gives four or five gridlines whatever the scale. */
function niceStep(max: number): number {
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

export function BarChart({ title, categories, values, values2, legend }: Props) {
  const all      = [...values, ...(values2 ?? [])];
  const max      = Math.max(...all, 1);
  const step     = max <= 6 ? 1 : niceStep(max);
  const top      = Math.ceil(max / step) * step;
  // Room for the widest tick label — "1,000,000" needs twice what "10" does.
  const PAD_L    = 14 + fmt(top).length * 5.2;
  const plotH    = H - PAD_B - PAD_T;
  const plotW    = W - PAD_L - 8;
  const slot     = plotW / categories.length;
  const series   = values2 ? 2 : 1;
  const barW     = Math.min(series === 2 ? 20 : 38, (slot * 0.7) / series);
  const y        = (v: number) => PAD_T + plotH - (v / top) * plotH;

  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  return (
    <div className="my-3 flex flex-col items-center">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: 360 }} role="img"
           aria-label={title ?? 'דיאגרמת עמודות'}>
        {title && (
          <text x={W / 2} y={12} textAnchor="middle" direction="rtl"
                fontSize="11" fontWeight="700" fill="#2D3047">{title}</text>
        )}

        {ticks.map(v => (
          <g key={v}>
            <line x1={PAD_L} y1={y(v)} x2={W - 8} y2={y(v)} stroke="#E5E0D8" strokeWidth="1" />
            <text x={PAD_L - 5} y={y(v) + 3} textAnchor="end" direction="ltr"
                  fontSize="8.5" fill="#9A9384">{fmt(v)}</text>
          </g>
        ))}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#2D3047" strokeWidth="1.5" />
        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - 8} y2={PAD_T + plotH} stroke="#2D3047" strokeWidth="1.5" />

        {categories.map((cat, i) => {
          const cx = PAD_L + slot * (i + 0.5);
          const bars = [values[i] ?? 0, ...(values2 ? [values2[i] ?? 0] : [])];
          return (
            <g key={cat}>
              {bars.map((v, k) => {
                const bx = cx - (barW * series) / 2 + k * barW;
                return (
                  <g key={k}>
                    <rect x={bx + 1} y={y(v)} width={barW - 2} height={PAD_T + plotH - y(v)}
                          rx="3" fill={COLORS[k]} />
                    <text x={bx + barW / 2} y={y(v) - 3} textAnchor="middle" direction="ltr"
                          fontSize={series === 2 ? '7.5' : '9.5'} fontWeight="700" fill="#2D3047">{fmt(v)}</text>
                  </g>
                );
              })}
              <text x={cx} y={PAD_T + plotH + 14} textAnchor="middle" direction="rtl"
                    fontSize="9.5" fill="#2D3047">{cat}</text>
            </g>
          );
        })}
      </svg>

      {legend && values2 && (
        <div className="flex gap-4 text-xs text-[#2D3047] mt-1" dir="rtl">
          {legend.map((name, k) => (
            <span key={name} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: COLORS[k] }} />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
