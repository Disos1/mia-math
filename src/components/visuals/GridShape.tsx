/**
 * Squared paper — the geometry booklet's working surface.
 *
 * One component serves three topics, because in the book they are all drawn on
 * the same squared paper:
 *   - area by counting (topic 8): full squares as cells, half squares as
 *     triangles (polys), so "count the halves in pairs" is visible;
 *   - reflective symmetry (topic 12): a dashed axis through the grid;
 *   - nets of a cube (topic 14): six cells, optionally lettered.
 *
 * Coordinates are grid units with (0,0) at the top-left; a cell [x, y] is the
 * square from (x, y) to (x+1, y+1).
 *
 * RTL: letters use textAnchor="middle", which centres the glyph whatever the
 * page direction, and set their direction explicitly (see PolygonShape).
 */

interface Props {
  cols:        number;
  rows:        number;
  cells?:      Array<[number, number]>;
  polys?:      Array<Array<[number, number]>>;
  /** A dashed line of symmetry: vertical at x, or horizontal at y. */
  axis?:       { x?: number; y?: number };
  /** One letter per cell, in the order of `cells`. */
  cellLabels?: string[];
}

const MAX_W = 240;

export function GridShape({ cols, rows, cells = [], polys = [], axis, cellLabels }: Props) {
  const s = Math.min(28, Math.floor(MAX_W / Math.max(cols, rows)));
  const W = cols * s, H = rows * s;
  const pad = 6;

  return (
    <div className="flex justify-center my-2">
      <svg width={W + pad * 2} height={H + pad * 2} viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
           role="img" aria-label="צורה על דף משבצות">
        {/* grid */}
        {Array.from({ length: cols + 1 }, (_, i) => (
          <line key={`v${i}`} x1={i * s} y1={0} x2={i * s} y2={H} stroke="#E5E0D8" strokeWidth="1" />
        ))}
        {Array.from({ length: rows + 1 }, (_, j) => (
          <line key={`h${j}`} x1={0} y1={j * s} x2={W} y2={j * s} stroke="#E5E0D8" strokeWidth="1" />
        ))}

        {cells.map(([x, y], i) => (
          <rect key={`c${i}`} x={x * s} y={y * s} width={s} height={s}
                fill="#C4A7E7" stroke="#2D3047" strokeWidth="1.5" />
        ))}

        {polys.map((pts, i) => (
          <polygon key={`p${i}`} points={pts.map(([x, y]) => `${x * s},${y * s}`).join(' ')}
                   fill="#C4A7E7" stroke="#2D3047" strokeWidth="1.5" strokeLinejoin="round" />
        ))}

        {cellLabels && cells.map(([x, y], i) => cellLabels[i] ? (
          <text key={`t${i}`} x={x * s + s / 2} y={y * s + s / 2 + 5} textAnchor="middle"
                fontSize="14" fontWeight="700" fill="#2D3047" style={{ direction: 'rtl' }}>
            {cellLabels[i]}
          </text>
        ) : null)}

        {axis?.x !== undefined && (
          <line x1={axis.x * s} y1={-pad} x2={axis.x * s} y2={H + pad}
                stroke="#E0533D" strokeWidth="2.5" strokeDasharray="6 4" />
        )}
        {axis?.y !== undefined && (
          <line x1={-pad} y1={axis.y * s} x2={W + pad} y2={axis.y * s}
                stroke="#E0533D" strokeWidth="2.5" strokeDasharray="6 4" />
        )}
      </svg>
    </div>
  );
}
