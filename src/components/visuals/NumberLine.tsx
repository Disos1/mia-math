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
}

const W   = 280;
const H   = 80;
const PAD = 18;

export function NumberLine({ min, max, step, from, to, arrowLabel }: Props) {
  const span    = max - min;
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);

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
            <text
              x={xOf(t)}
              y={y0 + 20}
              textAnchor="middle"
              fontSize="12"
              fontWeight="600"
              fill="#2D3047"
            >
              {t}
            </text>
          </g>
        ))}

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
