/**
 * Analog clock face — used for the MEAS_TIME_CROSS_HOUR skill.
 *
 * Renders a standard 12-hour face with hour + minute hands at `time` (HH:MM).
 * If `elapsedMin` is provided, draws a dashed arc sweeping clockwise from the
 * start minute-hand position to show the elapsed interval.
 *
 * The arc is intentionally discreet — a thin dashed ring, not a bold fill —
 * so the dominant visual is still the clock. The caption "+N min" sits below.
 */
interface Props {
  time:        string;
  elapsedMin?: number;
}

const CX = 60, CY = 60, R = 50;

export function AnalogClock({ time, elapsedMin }: Props) {
  const [hh, mm] = time.split(':').map(n => parseInt(n, 10));
  const minAngle = (mm / 60) * 360;                     // 0° at 12
  const hourAngle = ((hh % 12) / 12) * 360 + (mm / 60) * 30;

  // Arc from minute-hand start sweeping clockwise by `elapsedMin` minutes
  const arcStart = minAngle;
  const arcEnd   = (minAngle + (elapsedMin ?? 0) * 6) % 360;
  const arcR     = R - 8;
  const arcLarge = (elapsedMin ?? 0) > 30 ? 1 : 0;

  return (
    <div className="flex flex-col items-center my-2">
      <svg width="130" height="130" viewBox="0 0 120 120">
        {/* Face */}
        <circle cx={CX} cy={CY} r={R} fill="#FFF9EF" stroke="#2D3047" strokeWidth="2" />

        {/* Hour ticks */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) - 90;
          const x1 = CX + (R - 4) * Math.cos((a * Math.PI) / 180);
          const y1 = CY + (R - 4) * Math.sin((a * Math.PI) / 180);
          const x2 = CX + R * Math.cos((a * Math.PI) / 180);
          const y2 = CY + R * Math.sin((a * Math.PI) / 180);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2D3047" strokeWidth={i % 3 === 0 ? 2 : 1} />;
        })}

        {/* Elapsed arc */}
        {elapsedMin !== undefined && elapsedMin > 0 && (
          <path
            d={describeArc(CX, CY, arcR, arcStart, arcEnd, arcLarge)}
            fill="none"
            stroke="#C4A7E7"
            strokeWidth="2.5"
            strokeDasharray="3 3"
            strokeLinecap="round"
          />
        )}

        {/* Hour hand */}
        <Hand angle={hourAngle} length={R * 0.55} thickness={4} colour="#2D3047" />
        {/* Minute hand */}
        <Hand angle={minAngle}  length={R * 0.8}  thickness={3} colour="#FF9B7A" />

        {/* Centre dot */}
        <circle cx={CX} cy={CY} r={3} fill="#2D3047" />
      </svg>
      <div className="text-sm text-[#2D3047] mt-1 font-mono font-bold">{time}</div>
      {elapsedMin !== undefined && elapsedMin > 0 && (
        <div className="text-xs text-[#7B6F4E]">+{elapsedMin} דק׳</div>
      )}
    </div>
  );
}

function Hand({ angle, length, thickness, colour }: { angle: number; length: number; thickness: number; colour: string }) {
  // angle measured clockwise from 12 o'clock (top); SVG coords need -90°
  const a = ((angle - 90) * Math.PI) / 180;
  const x2 = CX + length * Math.cos(a);
  const y2 = CY + length * Math.sin(a);
  return (
    <line
      x1={CX} y1={CY} x2={x2} y2={y2}
      stroke={colour}
      strokeWidth={thickness}
      strokeLinecap="round"
    />
  );
}

/** Build an SVG arc path from `startAngle` to `endAngle` on a circle at (cx,cy,r).
 *  Angles are clockwise-from-12 (degrees). */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number, large: number): string {
  const p1 = polar(cx, cy, r, startAngle);
  const p2 = polar(cx, cy, r, endAngle);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y}`;
}

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
