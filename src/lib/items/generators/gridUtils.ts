/**
 * Squared-paper geometry shared by the area, symmetry and nets generators.
 *
 * A shape is a set of unit cells [x, y], y growing downward (screen order).
 * Everything here is computed, never listed: the cube nets are FOUND by
 * enumerating every six-cell shape and rolling a cube across it, so the set of
 * nets cannot drift from the truth (there are exactly 11, up to turning and
 * flipping — a test pins that).
 */

export type Cell = [number, number];

const key = ([x, y]: Cell) => `${x},${y}`;

/** Shift so the shape touches x = 0 and y = 0, sorted for a stable identity. */
export function normalize(cells: Cell[]): Cell[] {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my] as Cell)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

export const shapeKey = (cells: Cell[]) => normalize(cells).map(key).join(';');

export function bbox(cells: Cell[]): { cols: number; rows: number } {
  return {
    cols: Math.max(...cells.map(c => c[0])) + 1,
    rows: Math.max(...cells.map(c => c[1])) + 1,
  };
}

const NEIGHBOURS: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Unit edges on the outline — the perimeter, in cell sides. */
export function perimeterOf(cells: Cell[]): number {
  const set = new Set(cells.map(key));
  let p = 0;
  for (const [x, y] of cells) {
    for (const [dx, dy] of NEIGHBOURS) if (!set.has(key([x + dx, y + dy]))) p++;
  }
  return p;
}

/** Every fixed polyomino of n cells (each orientation counted separately). */
export function fixedPolyominoes(n: number): Cell[][] {
  let layer = new Map<string, Cell[]>([[shapeKey([[0, 0]]), [[0, 0]]]]);
  for (let size = 1; size < n; size++) {
    const next = new Map<string, Cell[]>();
    for (const shape of layer.values()) {
      const set = new Set(shape.map(key));
      for (const [x, y] of shape) {
        for (const [dx, dy] of NEIGHBOURS) {
          const c: Cell = [x + dx, y + dy];
          if (set.has(key(c))) continue;
          const grown = normalize([...shape, c]);
          const k = shapeKey(grown);
          if (!next.has(k)) next.set(k, grown);
        }
      }
    }
    layer = next;
  }
  return [...layer.values()];
}

/** The eight turnings and flippings of a shape, deduplicated. */
export function orientations(cells: Cell[]): Cell[][] {
  const out = new Map<string, Cell[]>();
  let cur = cells;
  for (let r = 0; r < 4; r++) {
    cur = cur.map(([x, y]) => [-y, x] as Cell);
    for (const s of [cur, cur.map(([x, y]) => [-x, y] as Cell)]) {
      const k = shapeKey(s);
      if (!out.has(k)) out.set(k, normalize(s));
    }
  }
  return [...out.values()];
}

/** Free (up to turning and flipping) identity of a shape. */
export const freeKey = (cells: Cell[]) => orientations(cells).map(shapeKey).sort()[0];

/**
 * Fold a six-cell net by rolling a cube across it.
 *
 * The cube starts on cell 0. Moving to a neighbouring cell rolls the cube over
 * that edge, and the face now on the paper is the face that cell becomes.
 * Returns the face (0–5) each cell lands on, or null when two cells land on
 * the same face — the shape then does not close into a cube.
 * Faces 0/1, 2/3 and 4/5 are opposite pairs.
 */
export function foldCube(cells: Cell[]): number[] | null {
  if (cells.length !== 6) return null;
  // Orientation: which face points down, up, east, west, south, north.
  type O = { d: number; u: number; e: number; w: number; s: number; n: number };
  const roll = (o: O, dx: number, dy: number): O =>
    dx === 1  ? { ...o, d: o.e, e: o.u, u: o.w, w: o.d } :
    dx === -1 ? { ...o, d: o.w, w: o.u, u: o.e, e: o.d } :
    dy === 1  ? { ...o, d: o.s, s: o.u, u: o.n, n: o.d } :
                { ...o, d: o.n, n: o.u, u: o.s, s: o.d };

  const index = new Map(cells.map((c, i) => [key(c), i] as const));
  const face: Array<number | undefined> = Array(6).fill(undefined);
  const start: O = { d: 0, u: 1, e: 2, w: 3, s: 4, n: 5 };
  const stack: Array<[number, O]> = [[0, start]];
  face[0] = 0;
  while (stack.length) {
    const [i, o] = stack.pop()!;
    const [x, y] = cells[i];
    for (const [dx, dy] of NEIGHBOURS) {
      const j = index.get(key([x + dx, y + dy]));
      if (j === undefined || face[j] !== undefined) continue;
      const o2 = roll(o, dx, dy);
      face[j] = o2.d;
      stack.push([j, o2]);
    }
  }
  const faces = face as number[];
  return new Set(faces).size === 6 ? faces : null;
}

export const oppositeFace = (f: number) => f ^ 1;
