/**
 * Polygon with Hebrew vertex letters — the geometry booklet's basic figure.
 *
 * Points live on a 0–100 canvas and are scaled into the SVG. Vertex letters sit
 * just outside the shape, pushed away from the centroid so they never land on a
 * side.
 *
 * RTL: every letter uses textAnchor="middle". Middle anchoring centres the glyph
 * on x in either text direction, so the page's dir="rtl" cannot push it
 * off-canvas — the failure that left a stray glyph beside every bar model
 * (fixed 2026-07-31). Direction is still set explicitly rather than inherited.
 */

interface Props {
  points:          Array<[number, number]>;
  labels?:         string[];
  diagonalsFrom?:  number;
  highlightSides?: number[];
}

const SIZE = 200;
const PAD  = 26;

export function PolygonShape({ points, labels, diagonalsFrom, highlightSides = [] }: Props) {
  const scale = (SIZE - PAD * 2) / 100;
  const P = points.map(([x, y]) => [PAD + x * scale, PAD + y * scale] as const);
  const n = P.length;

  const cx = P.reduce((s, p) => s + p[0], 0) / n;
  const cy = P.reduce((s, p) => s + p[1], 0) / n;

  const labelPos = (i: number) => {
    const [x, y] = P[i];
    const dx = x - cx, dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * 15, y + (dy / len) * 15 + 5] as const;
  };

  const highlighted = new Set(highlightSides);

  return (
    <div className="flex justify-center my-2">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} overflow="visible">
        <polygon
          points={P.map(p => p.join(',')).join(' ')}
          fill="#FFF3E8"
          stroke="#2D3047"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Emphasised sides (e.g. "the side אב" the question refers to) */}
        {P.map((p, i) => {
          if (!highlighted.has(i)) return null;
          const q = P[(i + 1) % n];
          return (
            <line key={`h${i}`} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]}
              stroke="#FF9B7A" strokeWidth="5" strokeLinecap="round" />
          );
        })}

        {/* Diagonals from one vertex — the pictorial layer for counting them */}
        {diagonalsFrom !== undefined && P.map((q, j) => {
          const i = diagonalsFrom;
          const adjacent = j === i || j === (i + 1) % n || j === (i - 1 + n) % n;
          if (adjacent) return null;
          return (
            <line key={`d${j}`} x1={P[i][0]} y1={P[i][1]} x2={q[0]} y2={q[1]}
              stroke="#7C3AED" strokeWidth="2" strokeDasharray="5 4" />
          );
        })}

        {P.map((p, i) => (
          <circle key={`v${i}`} cx={p[0]} cy={p[1]} r="3.5" fill="#2D3047" />
        ))}

        {labels && P.map((_, i) => {
          const [lx, ly] = labelPos(i);
          return (
            <text key={`l${i}`} x={lx} y={ly} textAnchor="middle"
              fontSize="16" fontWeight="700" fill="#2D3047"
              style={{ direction: 'rtl' }}>
              {labels[i]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
