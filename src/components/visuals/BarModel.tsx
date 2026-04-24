/**
 * Singapore-style bar model for word problems.
 *
 * `rows` is an array of horizontal bars stacked top-to-bottom. Each bar has
 * an optional row label (left column) and a sequence of parts. Parts specify
 * a `size` for relative width, an optional `label`, and a `highlight` flag.
 *
 * Rendering notes:
 *   - Part labels are drawn inside the segment when it is >= MIN_LABEL_PW px
 *     wide. Below that threshold an above-bar caption is used instead for
 *     highlighted parts (white text on a 14 px sliver is invisible on the
 *     white card background). Non-highlighted narrow parts show no label.
 *   - Above-bar captions add CAP_H px of vertical space above the bar row.
 *     The per-row offset is pre-computed so only rows that need it pay the
 *     height cost.
 *   - Row labels use textAnchor="start" at x=2 (not "end") because SVG BiDi
 *     handling of RTL text with textAnchor="end" is unreliable across browsers
 *     and produces a stray glyph at the left edge.
 *   - rx is clamped to pw/4 so very narrow rects never become oval dots.
 *   - Stroke is suppressed on segments < 6 px wide to avoid "black dot"
 *     artefacts where the 1.5 px border dominates the tiny segment area.
 *   - overflow="hidden" on the SVG prevents label text from leaking onto the
 *     white card background outside the SVG bounds.
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

const W            = 280;
const BAR_H        = 38;
const ROW_GAP      = 14;
const LABEL_W      = 80;   // left label column width
const MIN_LABEL_PW = 42;   // min segment px width to render text inside
const CAP_H        = 18;   // above-bar caption zone height (px)

export function BarModel({ rows }: Props) {
  if (rows.length === 0) return null;

  // All bars share the same horizontal scale (largest row sets the 100% mark)
  const maxTotal = Math.max(...rows.map(r => r.parts.reduce((s, p) => s + p.size, 0)));
  const barMaxW  = W - LABEL_W;

  // Pre-compute which rows need an above-bar caption (highlighted narrow part)
  const rowNeedsCaption = rows.map(row => {
    const rowTotal = row.parts.reduce((s, p) => s + p.size, 0);
    const rowW     = (rowTotal / maxTotal) * barMaxW;
    return row.parts.some(
      p => p.highlight && p.label && (p.size / rowTotal) * rowW < MIN_LABEL_PW
    );
  });

  // Compute per-row Y offsets (caption rows get extra CAP_H space above them)
  const rowOffsets: number[] = [];
  let y = 0;
  rows.forEach((_, i) => {
    if (rowNeedsCaption[i]) y += CAP_H;
    rowOffsets.push(y);
    y += BAR_H;
    if (i < rows.length - 1) y += ROW_GAP;
  });
  const totalH = y;

  return (
    <div className="flex justify-center my-2">
      <svg
        width={W}
        height={totalH}
        viewBox={`0 0 ${W} ${totalH}`}
        overflow="hidden"
      >
        {rows.map((row, rIdx) => {
          const rowY     = rowOffsets[rIdx];
          const rowTotal = row.parts.reduce((s, p) => s + p.size, 0);
          const rowW     = (rowTotal / maxTotal) * barMaxW;
          let cursor     = LABEL_W;

          return (
            <g key={rIdx}>

              {/* Row label — left-anchored for reliable RTL rendering */}
              {row.label && (
                <text
                  x={2}
                  y={rowY + BAR_H / 2 + 5}
                  textAnchor="start"
                  fontSize="12"
                  fontWeight="600"
                  fill="#2D3047"
                >
                  {row.label}
                </text>
              )}

              {row.parts.map((part, pIdx) => {
                const pw  = (part.size / rowTotal) * rowW;
                const x   = cursor;
                cursor   += pw;

                // rx capped to pw/4 — prevents narrow rects from becoming oval dots
                const rx = Math.min(3, Math.max(0, pw / 4));

                const showInlineLabel =
                  Boolean(part.label) && pw >= MIN_LABEL_PW;

                // Above-bar caption: highlighted + has label + too narrow for inline
                const showCaption =
                  Boolean(part.highlight && part.label && !showInlineLabel);

                // X-center for above-bar caption — clamped so text stays in SVG
                const capX = Math.min(
                  Math.max(x + pw / 2, LABEL_W + 12),
                  W - 12
                );

                return (
                  <g key={pIdx}>
                    <rect
                      x={x}
                      y={rowY}
                      width={Math.max(pw, 0.5)}   // always at least a hairline
                      height={BAR_H}
                      fill={part.highlight ? '#FF9B7A' : '#FFE8DD'}
                      stroke="#2D3047"
                      strokeWidth={pw < 6 ? 0 : 1.5}   // no stroke on hairline segs
                      rx={rx}
                    />

                    {/* Inline label — only when segment is wide enough */}
                    {showInlineLabel && (
                      <text
                        x={x + pw / 2}
                        y={rowY + BAR_H / 2 + 5}
                        textAnchor="middle"
                        fontSize="12"
                        fontWeight="700"
                        fill={part.highlight ? '#FFFFFF' : '#2D3047'}
                      >
                        {part.label}
                      </text>
                    )}

                    {/* Above-bar caption for highlighted segments too narrow for inline label */}
                    {showCaption && (
                      <g>
                        {/* Small leader line from caption baseline to bar top */}
                        <line
                          x1={capX}
                          y1={rowY - 2}
                          x2={capX}
                          y2={rowY}
                          stroke="#FF7040"
                          strokeWidth={1}
                        />
                        <text
                          x={capX}
                          y={rowY - 5}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="#C85000"
                        >
                          {part.label}
                        </text>
                      </g>
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
