/**
 * A box (תיבה) in the oblique drawing the textbook uses: the front face true
 * to size, the depth going back and up at 45°, hidden edges dashed.
 *
 * Options, one per topic that needs them:
 *   cubes       unit-cube lines on the visible faces — "volume in cubes" (17)
 *   dims        edge lengths printed beside three edges (15, 18, 20)
 *   diagonals   'face' draws the two diagonals of the front face,
 *               'space' one diagonal through the box (16)
 *
 * RTL: dimension labels are numbers plus a Hebrew unit. Each is its own
 * <text> with textAnchor="middle" and an explicit direction, so the page's
 * dir="rtl" cannot move it off its edge.
 */

import type { ReactElement } from 'react';

interface Props {
  l: number;
  w: number;
  h: number;
  cubes?:     boolean;
  dims?:      { unit: string };
  diagonals?: 'face' | 'space';
}

export function BoxShape({ l, w, h, cubes, dims, diagonals }: Props) {
  // Scale so the drawing fits ~240×200 whatever the dimensions.
  const depth = 0.5;                                    // receding edges at half length
  const span  = Math.max(l + w * depth * 0.7, h + w * depth * 0.7);
  const u     = Math.min(30, 200 / span);
  const dx = w * u * depth * 0.7, dy = w * u * depth * 0.7;
  // Room on the left for the height label ("12 ס"מ" is ~40px wide).
  const X0 = dims ? 56 : 14, Y0 = 20 + dy;             // front-top-left corner
  const L = l * u, H = h * u;

  // Front face corners and their back counterparts.
  const F = { tl: [X0, Y0], tr: [X0 + L, Y0], br: [X0 + L, Y0 + H], bl: [X0, Y0 + H] } as const;
  const back = (p: readonly [number, number]) => [p[0] + dx, p[1] - dy] as const;
  const B = { tl: back(F.tl), tr: back(F.tr), br: back(F.br), bl: back(F.bl) };

  const line = (a: readonly number[], b: readonly number[], key: string, dashed = false, color = '#2D3047', width = 2) => (
    <line key={key} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={width}
          strokeDasharray={dashed ? '5 4' : undefined} strokeLinecap="round" />
  );

  const grid: ReactElement[] = [];
  if (cubes) {
    const thin = (a: readonly number[], b: readonly number[], k: string) =>
      <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#9A86C4" strokeWidth="1" />;
    for (let i = 1; i < l; i++) {                       // front verticals + top depth lines
      grid.push(thin([X0 + i * u, Y0], [X0 + i * u, Y0 + H], `fv${i}`));
      grid.push(thin([X0 + i * u, Y0], [X0 + i * u + dx, Y0 - dy], `tv${i}`));
    }
    for (let j = 1; j < h; j++) {                       // front horizontals + side depth lines
      grid.push(thin([X0, Y0 + j * u], [X0 + L, Y0 + j * u], `fh${j}`));
      grid.push(thin([X0 + L, Y0 + j * u], [X0 + L + dx, Y0 + j * u - dy], `sh${j}`));
    }
    for (let k = 1; k < w; k++) {                       // depth steps on top and side
      const ox = (dx * k) / w, oy = (dy * k) / w;
      grid.push(thin([X0 + ox, Y0 - oy], [X0 + L + ox, Y0 - oy], `tk${k}`));
      grid.push(thin([X0 + L + ox, Y0 - oy], [X0 + L + ox, Y0 + H - oy], `sk${k}`));
    }
  }

  const label = (x: number, y: number, text: string, key: string) => (
    <text key={key} x={x} y={y} textAnchor="middle" fontSize="12" fontWeight="700" fill="#2D3047"
          style={{ direction: 'rtl' }}>{text}</text>
  );

  const width  = X0 + L + dx + 40;
  const height = Y0 + H + 34;

  return (
    <div className="flex justify-center my-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="תיבה">
        {/* visible faces */}
        <polygon points={[F.tl, F.tr, F.br, F.bl].map(p => p.join(',')).join(' ')} fill="#FFF3E8" />
        <polygon points={[F.tl, F.tr, B.tr, B.tl].map(p => p.join(',')).join(' ')} fill="#F3E9FF" />
        <polygon points={[F.tr, F.br, B.br, B.tr].map(p => p.join(',')).join(' ')} fill="#EDE3F9" />
        {grid}

        {/* hidden edges */}
        {line(F.bl, B.bl, 'h1', true, '#9A9384', 1.5)}
        {line(B.bl, B.br, 'h2', true, '#9A9384', 1.5)}
        {line(B.bl, B.tl, 'h3', true, '#9A9384', 1.5)}

        {/* visible edges */}
        {line(F.tl, F.tr, 'e1')}{line(F.tr, F.br, 'e2')}{line(F.br, F.bl, 'e3')}{line(F.bl, F.tl, 'e4')}
        {line(F.tl, B.tl, 'e5')}{line(F.tr, B.tr, 'e6')}{line(F.br, B.br, 'e7')}
        {line(B.tl, B.tr, 'e8')}{line(B.tr, B.br, 'e9')}

        {diagonals === 'face' && (<>
          {line(F.tl, F.br, 'd1', false, '#E0533D', 2)}
          {line(F.tr, F.bl, 'd2', false, '#E0533D', 2)}
        </>)}
        {diagonals === 'space' && line(F.bl, B.tr, 'd3', true, '#E0533D', 2.5)}

        {dims && (<>
          {label(X0 + L / 2, Y0 + H + 18, `${l} ${dims.unit}`, 'dl')}
          {label(X0 + L + dx / 2 + 26, Y0 + H - dy / 2 + 4, `${w} ${dims.unit}`, 'dw')}
          {label(X0 - 26, Y0 + H / 2 + 4, `${h} ${dims.unit}`, 'dh')}
        </>)}
      </svg>
    </div>
  );
}
