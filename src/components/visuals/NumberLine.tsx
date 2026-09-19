/**
 * Number line with optional jump arrow — used for unit conversion
 * (e.g. "3m → cm") and anywhere else a linear model beats a grouped one.
 *
 * `min`, `max`, `step` define the tick range. If `from` / `to` are given, an
 * arrow curves from one tick to the other with an optional caption
 * (e.g. "+300" or "× 100").
 */
interface Props {
  min:         number;
  max:         number;
  step:        number;
  from?:       number;
  to?:         number;
  arrowLabel?: string;
  /** Marked point, drawn as a dot with a caption above it. */
  mark?:        number;
  markLabel?:   string;
  /** Tick values to label; default labels every tick. */
  labelValues?: number[];
}

/** Israeli textbooks group large numbers with commas: 370,000. */
function fmtTick(v: number): string {
  // Matches the generators' formatting (4,738 / 370,000) so the line and the
  // question never disagree about how a number is written.
  return Math.abs(v) >= 1000 ? v.toLocaleString('en-US') : String(v);
}

const W   = 280;
const H   = 80;
/** Minimum side padding; widened per render so end labels are never clipped. */
const MIN_PAD = 18;

export function NumberLine({ min, max, step, from, to, arrowLabel, mark, markLabel, labelValues }: Props) {
  const span    = max - min;
  const ticks: number[] = [];
  // Integer tick positions avoid floating drift on steps like 10,000.
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) ticks.push(min + i * step);
  const labelled = new Set(labelValues ?? ticks);

  // An end label is centred on the end tick, so half of it hangs past the line.
  // "1,000,000" at 11px is ~55px wide: with a fixed 18px pad it was clipped by
  // the SVG edge. Pad by the widest printed label instead (≈6.2px per glyph).
  const widest = Math.max(
    ...[...labelled].map(v => fmtTick(v).length),
    mark !== undefined && markLabel ? markLabel.length : 0,
  );
  const PAD = Math.max(MIN_PAD, Math.ceil(widest * 3.2) + 6);

  const xOf = (v: number) => PAD + ((v - min) / span) * (W - PAD * 2);

  const y0 = H - 26;

  return (
    <div className="flex justify-center my-2">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Base line */}
        <line x1={PAD} y1={y0} x2={W - PAD} y2={y0} stroke="#2D3047" strokeWidth="2" />

        {/* Ticks + labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={xOf(t)} y1={y0 - 5} x2={xOf(t)} y2={y0 + 5} stroke="#2D3047" strokeWidth="2" />
            {labelled.has(t) && (
              <text
                x={xOf(t)}
                y={y0 + 20}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="#2D3047"
                style={{ direction: 'ltr' }}
              >
                {fmtTick(t)}
              </text>
            )}
          </g>
        ))}

        {/* Marked point — the number being placed or rounded */}
        {mark !== undefined && (
          <g>
            <circle cx={xOf(mark)} cy={y0} r="6" fill="#FF9B7A" stroke="#2D3047" strokeWidth="1.5" />
            {markLabel && (
              <text
                x={xOf(mark)}
                y={y0 - 12}
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="#D96000"
                style={{ direction: 'ltr' }}
              >
                {markLabel}
              </text>
            )}
          </g>
        )}

        {/* Jump arrow */}
        {from !== undefined && to !== undefined && (
          <JumpArrow xFrom={xOf(from)} xTo={xOf(to)} y={y0} label={arrowLabel} />
        )}
      </svg>
    </div>
  );
}

function JumpArrow({ xFrom, xTo, y, label }: { xFrom: number; xTo: number; y: number; label?: string }) {
  // Curved arrow above the line
  const midX = (xFrom + xTo) / 2;
  const arcH = Math.min(26, Math.abs(xTo - xFrom) * 0.5);
  const topY = y - arcH - 4;

  return (
    <g>
      <path
        d={`M ${xFrom} ${y - 4} Q ${midX} ${topY} ${xTo} ${y - 4}`}
        fill="none"
        stroke="#FF9B7A"
        strokeWidth="2.5"
      />
      {/* Arrow head at destination */}
      <polygon
        points={`${xTo},${y - 4} ${xTo - 6},${y - 10} ${xTo - 6},${y + 2}`}
        fill="#FF9B7A"
      />
      {label && (
        <text
          x={midX}
          y={topY - 2}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#FF9B7A"
        >
          {label}
        </text>
      )}
    </g>
  );
}
