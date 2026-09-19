/**
 * Two fraction circles side by side for unit-fraction comparison.
 *
 * Each circle is split into N equal pie slices; the first slice is filled with
 * the primary warm colour so the eye lands on "one part of N". Labels (e.g. "½",
 * "⅓") sit directly below each circle.
 *
 * Pedagogy: the bigger-denominator circle has smaller slices — the visual
 * directly contradicts the ERR_FRACTION_BIAS misconception that ⅓ > ½ because
 * 3 > 2.
 */
interface Props {
  partsA:   number;
  labelA:   string;
  partsB:   number;
  labelB:   string;
  /** Slices shaded in each circle. Defaults to 1, preserving the unit-fraction look. */
  shadedA?: number;
  shadedB?: number;
  /** Render only circle A ("what part is shaded?"). */
  single?:  boolean;
}

export function FractionCircles({ partsA, labelA, partsB, labelB, shadedA = 1, shadedB = 1, single = false }: Props) {
  return (
    <div className="flex items-center justify-around my-2">
      <Circle parts={partsA} shaded={shadedA} label={labelA} />
      {!single && <Circle parts={partsB} shaded={shadedB} label={labelB} />}
    </div>
  );
}

function Circle({ parts, shaded, label }: { parts: number; shaded: number; label: string }) {
  const r = 50, cx = 60, cy = 60;
  const slices = Array.from({ length: parts }, (_, i) => {
    const a0 = (i * 2 * Math.PI) / parts - Math.PI / 2;
    const a1 = ((i + 1) * 2 * Math.PI) / parts - Math.PI / 2;
    const x1 = cx + r * Math.cos(a0), y1 = cy + r * Math.sin(a0);
    const x2 = cx + r * Math.cos(a1), y2 = cy + r * Math.sin(a1);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return (
      <path
        key={i}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`}
        fill={i < shaded ? '#FF9B7A' : '#FFE8DD'}
        stroke="#2D3047"
        strokeWidth="2"
      />
    );
  });
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 120 120">{slices}</svg>
      {/* Label is HTML, not SVG text, so RTL never mirrors or clips it. The
          dir=ltr isolate keeps "3/8" reading left-to-right inside the page. */}
      {label && <div className="text-2xl font-bold" dir="ltr">{label}</div>}
    </div>
  );
}
