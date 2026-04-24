/**
 * Singapore-style bar model for word problems.
 *
 * `rows` is an array of horizontal bars stacked top-to-bottom. Each bar has
 * optional label (left side) and a sequence of parts. Parts specify a `size`
 * used for relative width, plus an optional `label` (number or "?") and a
 * `highlight` flag that fills the segment with the primary warm colour.
 *
 * Example — "Dani had 30 stickers, gave 12 to Leah. How many left?"
 *
 *   rows: [
 *     { label: 'דני התחיל', parts: [{ size: 30, label: '30' }] },
 *     { label: 'עכשיו',    parts: [{ size: 12, label: '12' }, { size: 18, label: '?', highlight: true }] },
 *   ]
 *
 * The two-row layout with shared horizontal scale makes the part-whole
 * relationship legible at a glance.
 */
interface Part {
  size:       number;
  label?:     string;
  highlight?: boolean;
}

interface Row {
  label?: string;
  parts:  Part[];
}

interface Props {
  rows: Row[];
}

const W          = 280;
const BAR_H      = 38;
const ROW_GAP    = 14;
const LABEL_W    = 84;          // left label column width

export function BarModel({ rows }: Props) {
  if (rows.length === 0) return null;

  // Use the largest row's total size so bars across rows share the same scale
  const maxTotal = Math.max(...rows.map(r => r.parts.reduce((s, p) => s + p.size, 0)));
  const barMaxW  = W - LABEL_W;

  const totalH = rows.length * BAR_H + (rows.length - 1) * ROW_GAP;

  return (
    <div className="flex justify-center my-2">
      <svg width={W} height={totalH} viewBox={`0 0 ${W} ${totalH}`}>
        {rows.map((row, rIdx) => {
          const rowY     = rIdx * (BAR_H + ROW_GAP);
          const rowTotal = row.parts.reduce((s, p) => s + p.size, 0);
          const rowW     = (rowTotal / maxTotal) * barMaxW;
          let cursor     = LABEL_W;

          return (
            <g key={rIdx}>
              {/* Row label (RTL-friendly; anchored to the right of the label column) */}
              {row.label && (
                <text
                  x={LABEL_W - 6}
                  y={rowY + BAR_H / 2 + 5}
                  textAnchor="end"
                  fontSize="13"
                  fontWeight="600"
                  fill="#2D3047"
                >
                  {row.label}
                </text>
              )}

              {row.parts.map((part, pIdx) => {
                const pw = (part.size / rowTotal) * rowW;
                const x  = cursor;
                cursor  += pw;
                return (
                  <g key={pIdx}>
                    <rect
                      x={x}
                      y={rowY}
                      width={pw}
                      height={BAR_H}
                      fill={part.highlight ? '#FF9B7A' : '#FFE8DD'}
                      stroke="#2D3047"
                      strokeWidth="1.5"
                      rx="3"
                    />
                    {part.label && (
                      <text
                        x={x + pw / 2}
                        y={rowY + BAR_H / 2 + 5}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="700"
                        fill={part.highlight ? '#FFFFFF' : '#2D3047'}
                      >
                        {part.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
