/**
 * Base-10 block visual for place-value and borrowing-across-zero problems.
 *
 * Renders three columns from right-to-left (RTL context):
 *   - Hundreds: 10×10 filled squares
 *   - Tens:     1×10 rods (vertical)
 *   - Ones:     single cubes
 *
 * `regroupLabel` places a thin banner above the grid — used to remind the
 * learner of the trade ("1 מאה = 10 עשרות") right next to the picture.
 *
 * Layout aims at ~260 px wide; each block style is drawn at a consistent cell
 * size so blocks across columns read as commensurate (a rod visibly equals ten
 * unit cubes).
 */
interface Props {
  hundreds:     number;
  tens:         number;
  ones:         number;
  regroupLabel?: string;
}

const CELL = 10;          // one unit cube side
const GAP  = 14;          // gap between block groups

export function BaseTenBlocks({ hundreds, tens, ones, regroupLabel }: Props) {
  // Hundreds are 10×10 squares; scale them a bit smaller than the raw
  // arithmetic to keep things tidy on screen.
  const hSide = CELL * 10;  // 100 px per hundred
  const tSide = CELL * 10;  // 100 px tall, 10 px wide per ten rod
  const oSide = CELL;       // 10 px per one cube

  // Stack hundreds horizontally; cap at 9 for legibility
  const hundredsArr = Array.from({ length: Math.min(hundreds, 9) });
  const tensArr     = Array.from({ length: Math.min(tens, 9) });
  const onesArr     = Array.from({ length: Math.min(ones, 9) });

  const hBlockW = hundredsArr.length * (hSide / 2 + 2);   // squash hundreds horizontally so 9 fit
  const tBlockW = tensArr.length * (CELL + 2);
  const oBlockW = Math.min(onesArr.length, 5) * (CELL + 2);

  const colGap = GAP;
  const H = hSide + 6;
  const totalWidth = hBlockW + tBlockW + oBlockW + colGap * 2 + 8;

  let cursor = 4;  // RTL friendly: start from left padding

  return (
    <div className="flex flex-col items-center gap-2 my-2">
      {regroupLabel && (
        <div className="text-xs text-[#7B6F4E] bg-[#FFF3D6] px-3 py-1 rounded-full">
          {regroupLabel}
        </div>
      )}

      <svg width={Math.max(totalWidth, 140)} height={H + (ones > 0 ? 20 : 0)} viewBox={`0 0 ${Math.max(totalWidth, 140)} ${H + (ones > 0 ? 20 : 0)}`}>
        {/* Hundreds — 10×10 grids (squashed to half-width for space) */}
        {hundredsArr.map((_, i) => {
          const w = hSide / 2;
          const x = cursor;
          cursor += w + 2;
          return (
            <g key={`h${i}`}>
              <rect x={x} y={2} width={w} height={hSide} fill="#C4A7E7" stroke="#2D3047" strokeWidth="1.5" rx="2" />
              {/* grid lines to suggest 10×10 */}
              {Array.from({ length: 9 }).map((_, k) => (
                <line
                  key={`hv${k}`}
                  x1={x}
                  y1={2 + ((k + 1) * hSide) / 10}
                  x2={x + w}
                  y2={2 + ((k + 1) * hSide) / 10}
                  stroke="#2D3047"
                  strokeOpacity="0.35"
                  strokeWidth="0.5"
                />
              ))}
            </g>
          );
        })}

        {/* Gap before tens */}
        {(() => { cursor += tensArr.length > 0 ? colGap : 0; return null; })()}

        {/* Tens — tall rods */}
        {tensArr.map((_, i) => {
          const x = cursor;
          cursor += CELL + 2;
          return (
            <g key={`t${i}`}>
              <rect x={x} y={2} width={CELL} height={tSide} fill="#FFD98E" stroke="#2D3047" strokeWidth="1.5" rx="1.5" />
              {/* segment ticks */}
              {Array.from({ length: 9 }).map((_, k) => (
                <line
                  key={`tt${k}`}
                  x1={x}
                  y1={2 + ((k + 1) * tSide) / 10}
                  x2={x + CELL}
                  y2={2 + ((k + 1) * tSide) / 10}
                  stroke="#2D3047"
                  strokeOpacity="0.35"
                  strokeWidth="0.5"
                />
              ))}
            </g>
          );
        })}

        {/* Gap before ones */}
        {(() => { cursor += onesArr.length > 0 ? colGap : 0; return null; })()}

        {/* Ones — small cubes stacked in rows of 5 */}
        {onesArr.map((_, i) => {
          const row = Math.floor(i / 5);
          const col = i % 5;
          const x = cursor + col * (CELL + 2);
          const y = 2 + row * (CELL + 2);
          return (
            <rect
              key={`o${i}`}
              x={x}
              y={y}
              width={oSide}
              height={oSide}
              fill="#FF9B7A"
              stroke="#2D3047"
              strokeWidth="1.5"
              rx="1"
            />
          );
        })}

        {/* Overflow count label for each column (when > 9 blocks) */}
        {hundreds > 9 && (
          <text x={4} y={H + 16} fontSize="11" fontWeight="700" fill="#2D3047">×{hundreds}</text>
        )}
        {tens > 9 && (
          <text x={hBlockW + colGap + 4} y={H + 16} fontSize="11" fontWeight="700" fill="#2D3047">×{tens}</text>
        )}
        {ones > 9 && (
          <text x={hBlockW + tBlockW + colGap * 2 + 4} y={H + 16} fontSize="11" fontWeight="700" fill="#2D3047">×{ones}</text>
        )}
      </svg>
    </div>
  );
}
