/**
 * A single horizontal bar split into N equal parts, with the first K parts
 * filled in the primary warm colour.
 *
 * Used for:
 *   - "¼ of 20" — show a bar of 4 parts, 1 highlighted, total labelled 20
 *   - Any "fraction of a total" visual where grouping dots would be cluttered
 *
 * The `total` label (if given) sits below the bar with a small bracket so the
 * learner reads "this whole thing is 20" then "one part of four".
 */
interface Props {
  parts:       number;
  highlighted: number;
  total?:      number;
}

export function FractionBar({ parts, highlighted, total }: Props) {
  const W = 260;
  const H = 48;
  const partWidth = W / parts;

  return (
    <div className="flex flex-col items-center gap-2 my-2">
      <svg width={W} height={total !== undefined ? H + 28 : H} viewBox={`0 0 ${W} ${total !== undefined ? H + 28 : H}`}>
        {/* Bar segments */}
        {Array.from({ length: parts }).map((_, i) => (
          <rect
            key={i}
            x={i * partWidth}
            y={0}
            width={partWidth}
            height={H}
            fill={i < highlighted ? '#FF9B7A' : '#FFE8DD'}
            stroke="#2D3047"
            strokeWidth="2"
          />
        ))}

        {/* Total bracket below */}
        {total !== undefined && (
          <>
            <line x1="2" y1={H + 8} x2={W - 2} y2={H + 8} stroke="#2D3047" strokeWidth="2" />
            <line x1="2" y1={H + 4} x2="2" y2={H + 12} stroke="#2D3047" strokeWidth="2" />
            <line x1={W - 2} y1={H + 4} x2={W - 2} y2={H + 12} stroke="#2D3047" strokeWidth="2" />
            <text
              x={W / 2}
              y={H + 24}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#2D3047"
            >
              {total}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}
