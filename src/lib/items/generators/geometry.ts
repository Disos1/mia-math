/**
 * Geometry booklet, units 1–2 (ה.ש.ב.ח.ה ד' "גאומטריה", pp. 7–30).
 *
 *   GEOM_POLYGONS      — מצולעים ואלכסונים: naming polygons by counting sides
 *                        and vertices; how many diagonals leave one vertex.
 *   GEOM_PARALLEL_PERP — צלעות מקבילות וצלעות מאונכות: find the side parallel
 *                        or perpendicular to a given side, count parallel pairs.
 *
 * Correctness is COMPUTED, never hand-labelled. Which sides are parallel or
 * perpendicular is derived from the coordinates with an angle test, so a typo in
 * a shape table cannot mark her right answer wrong.
 *
 * Shapes are drawn rotated. Children who only ever see parallel sides lying
 * horizontally learn "parallel = flat" — and the book explicitly asks for
 * parallel lines in complex drawings. Rotation makes that heuristic fail.
 *
 * Layers: in geometry the figure IS the question, so figure items are abstract.
 * Only the scaffolded variant (diagonals already drawn) is pictorial. Tagging
 * every figure pictorial would make the skill impossible to master, because the
 * mastery ledger counts abstract answers only.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

type Pt = [number, number];

const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח'];

export const POLYGON_NAMES: Record<number, string> = {
  3: 'משולש', 4: 'מרובע', 5: 'מחומש', 6: 'משושה', 7: 'משובע', 8: 'מתומן',
  9: 'מתושע', 10: 'מעושר',
};

/** Every polygon the grade-4 booklet names. */
const POLY_SIDES = [3, 4, 5, 6, 7, 8, 9, 10];

// ─── Shape helpers ───────────────────────────────────────────────────────────

/** Regular n-gon on the 0–100 canvas, first vertex at the top. */
export function regularPolygon(n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [50 + 46 * Math.cos(a), 50 + 46 * Math.sin(a)] as Pt;
  });
}

/** Rotate about the centre, then re-fit into the canvas keeping the aspect ratio. */
export function rotateAndFit(points: Pt[], degrees: number): Pt[] {
  const r = (degrees * Math.PI) / 180;
  const rot = points.map(([x, y]) => {
    const dx = x - 50, dy = y - 50;
    return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)] as Pt;
  });
  const xs = rot.map(p => p[0]), ys = rot.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = 100 / Math.max(maxX - minX, maxY - minY);
  const offX = (100 - (maxX - minX) * s) / 2, offY = (100 - (maxY - minY) * s) / 2;
  return rot.map(([x, y]) => [offX + (x - minX) * s, offY + (y - minY) * s] as Pt);
}

function sideVector(pts: Pt[], i: number): Pt {
  const a = pts[i], b = pts[(i + 1) % pts.length];
  return [b[0] - a[0], b[1] - a[1]];
}

const EPS = 0.01;   // sine/cosine tolerance — ≈0.6°, far tighter than any drawn shape

/** Sides i and j are parallel (cross product ≈ 0). */
export function isParallel(pts: Pt[], i: number, j: number): boolean {
  const [ax, ay] = sideVector(pts, i), [bx, by] = sideVector(pts, j);
  return Math.abs(ax * by - ay * bx) / (Math.hypot(ax, ay) * Math.hypot(bx, by)) < EPS;
}

/** Sides i and j are perpendicular (dot product ≈ 0). */
export function isPerpendicular(pts: Pt[], i: number, j: number): boolean {
  const [ax, ay] = sideVector(pts, i), [bx, by] = sideVector(pts, j);
  return Math.abs(ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by)) < EPS;
}

/** Acute angle between the lines of sides i and j: 0° parallel, 90° perpendicular. */
export function lineAngle(pts: Pt[], i: number, j: number): number {
  const [ax, ay] = sideVector(pts, i), [bx, by] = sideVector(pts, j);
  const cos = Math.abs(ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
  return (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
}

export function sideName(labels: string[], i: number): string {
  return labels[i] + labels[(i + 1) % labels.length];
}

// ─── GEOM_POLYGONS ───────────────────────────────────────────────────────────

const PG = 'GEOM_POLYGONS';

function* polygonNaming(): Generator<PracticeItem> {
  for (const n of POLY_SIDES) {
    for (const deg of [0, 20, 45, 70, 115, 160]) {
      const others = POLY_SIDES.filter(x => x !== n)
        .sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b).slice(0, 3);
      yield buildItem({
        itemId:        `G_PG_NAME_${n}_${deg}`,
        skillCode:     PG,
        question:      'איך קוראים למצולע הזה?',
        correct:       POLYGON_NAMES[n],
        signature:     null, signatureCode: null,
        distractors:   others.map(x => POLYGON_NAMES[x]),
        visual:        { type: 'polygon', points: rotateAndFit(regularPolygon(n), deg), labels: LETTERS.slice(0, n) },
        cpaLayer:      'abstract', difficulty: n >= 7 ? 2 : 1, rng: () => 0.5,
        steps: [
          { text: 'סופרים את הצלעות. כמה יש?', answer: n },
          { text: `למצולע עם ${n} צלעות קוראים ${POLYGON_NAMES[n]}.` },
        ],
      });
    }
  }
}

function* sidesAndVertices(): Generator<PracticeItem> {
  // Name → count, no picture: does she know what the name means?
  // Named: no drawing, she has to know what the word means.
  for (const n of POLY_SIDES) {
    for (const what of ['צלעות', 'קדקודים'] as const) {
      yield buildItem({
        itemId:        `G_PG_COUNT_${n}_${what === 'צלעות' ? 'S' : 'V'}`,
        skillCode:     PG,
        question:      `כמה ${what} יש ל${POLYGON_NAMES[n]}?`,
        correct:       n, signature: null, signatureCode: null, distractors: [],
        cpaLayer:      'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'בכל מצולע מספר הצלעות שווה למספר הקדקודים.' },
          { text: `${POLYGON_NAMES[n]} — כמה ${what}?`, answer: n },
        ],
      });
    }
  }

  // Drawn: counting off a figure, and a different rotation is a different
  // question — a tilted heptagon is not the same task as an upright one.
  for (const n of POLY_SIDES) {
    for (const deg of [0, 35, 80, 125]) {
      for (const what of ['צלעות', 'קדקודים'] as const) {
        yield buildItem({
          itemId:        `G_PG_DRAWN_${n}_${deg}_${what === 'צלעות' ? 'S' : 'V'}`,
          skillCode:     PG,
          question:      `כמה ${what} יש למצולע שבתמונה?`,
          correct:       n, signature: null, signatureCode: null, distractors: [],
          visual:        { type: 'polygon', points: rotateAndFit(regularPolygon(n), deg), labels: LETTERS.slice(0, n) },
          cpaLayer:      'abstract', difficulty: n >= 8 ? 2 : 1, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'סופרים סביב הצורה, ומתחילים במקום קבוע כדי לא לספור פעמיים.' },
            { text: `כמה ${what} ספרת?`, answer: n },
          ],
        });
      }
    }
  }
}

function* diagonalsFromVertex(): Generator<PracticeItem> {
  // From one vertex you can reach every other vertex except itself and its two
  // neighbours (those are sides): n − 3. Joining to all others gives n − 1 —
  // the sides counted as diagonals.
  for (const n of POLY_SIDES.filter(x => x >= 4)) {
    for (const pictorial of [false, true]) {
      yield buildItem({
        itemId:        `G_PG_DIAG_${n}${pictorial ? '_P' : ''}`,
        skillCode:     PG,
        question:      `כמה אלכסונים יוצאים מהקדקוד א ב${POLYGON_NAMES[n]}?`,
        correct:       n - 3,
        signature:     n - 1,
        signatureCode: 'ERR_DIAGONAL_SIDES',
        distractors:   [],
        visual:        {
          type: 'polygon', points: regularPolygon(n), labels: LETTERS.slice(0, n),
          ...(pictorial ? { diagonalsFrom: 0 } : {}),
        },
        cpaLayer:      pictorial ? 'pictorial' : 'abstract',
        difficulty:    n >= 7 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `כמה קדקודים יש ל${POLYGON_NAMES[n]}?`, answer: n },
          { text: 'לא מחברים את א לעצמו, וגם לא לשני השכנים שלו — אלה צלעות, לא אלכסונים. כמה נשארים?', answer: n - 3 },
        ],
      });
    }
  }
}

export function generatePolygons(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...polygonNaming(), ...sidesAndVertices(), ...diagonalsFromVertex()], opts);
}

// ─── GEOM_PARALLEL_PERP ──────────────────────────────────────────────────────

const PP = 'GEOM_PARALLEL_PERP';

/**
 * Shape library, drawn upright; rotation is applied per item. Nothing here says
 * which sides are parallel — that is computed from the points.
 */
const SHAPES: Array<{ key: string; name: string; pts: Pt[] }> = [
  { key: 'rect',   name: 'מלבן',        pts: [[0, 20], [100, 20], [100, 80], [0, 80]] },
  { key: 'square', name: 'ריבוע',       pts: [[10, 10], [90, 10], [90, 90], [10, 90]] },
  { key: 'trap',   name: 'טרפז',        pts: [[25, 20], [75, 20], [100, 80], [0, 80]] },
  { key: 'rtrap',  name: 'טרפז ישר זווית', pts: [[0, 20], [60, 20], [100, 80], [0, 80]] },
  { key: 'para',   name: 'מקבילית',     pts: [[25, 20], [100, 20], [75, 80], [0, 80]] },
  { key: 'quad',   name: 'מרובע',       pts: [[10, 30], [70, 5], [100, 75], [20, 95]] },
  { key: 'rtri',   name: 'משולש ישר זווית', pts: [[0, 0], [0, 100], [80, 100]] },
  { key: 'hex',    name: 'משושה',       pts: regularPolygon(6) },
];

const ROTATIONS = [0, 25, 60, 115];

/**
 * "No such side" is always on offer. The misconception this strand exists for
 * is "a tilted shape has no perpendicular sides" — a child holding it answers
 * NONE, and without that option she is left a coin flip between two sides.
 *
 * It is also sometimes the right answer, or she learns to ignore it. Only where
 * the eye can see it (every other side at least CLEAR° from qualifying) and on
 * one rotation per shape: 23 of 127 side questions (18%), below the 25–33%
 * a random tap scores, so "always none" loses — never a strategy.
 */
export const NO_SUCH_SIDE = 'אין צלע כזאת';
const CLEAR = 20;
const NONE_ROTATION = 60;

function* parallelPerp(): Generator<PracticeItem> {
  for (const shape of SHAPES) {
    for (const deg of ROTATIONS) {
      const pts    = rotateAndFit(shape.pts, deg);
      const n      = pts.length;
      const labels = LETTERS.slice(0, n);
      const sides  = Array.from({ length: n }, (_, i) => i);

      for (const ref of sides) {
        const par  = sides.filter(j => j !== ref && isParallel(pts, ref, j));
        const perp = sides.filter(j => j !== ref && isPerpendicular(pts, ref, j));
        const others = sides.filter(j => j !== ref);
        const pool = [NO_SUCH_SIDE, ...others.map(j => sideName(labels, j))];
        const refName = sideName(labels, ref);
        const clearlyNoParallel = others.every(j => lineAngle(pts, ref, j) >= CLEAR);
        const clearlyNoPerp     = others.every(j => 90 - lineAngle(pts, ref, j) >= CLEAR);
        const visual = { type: 'polygon' as const, points: pts, labels, highlightSides: [ref] };

        // "Which side is parallel to X?" — only when exactly one is.
        if (par.length === 1) {
          const correct = sideName(labels, par[0]);
          const swap    = perp.length > 0 ? sideName(labels, perp[0]) : null;
          yield buildItem({
            itemId:        `G_PP_PAR_${shape.key}_${deg}_${ref}`,
            skillCode:     PP,
            question:      `איזו צלע מקבילה לצלע ${refName}?`,
            correct,
            signature:     swap,
            signatureCode: swap ? 'ERR_PARALLEL_PERP_SWAP' : null,
            distractors:   pool.filter(s => s !== correct && s !== swap),
            visual,
            cpaLayer:      'abstract', difficulty: deg === 0 ? 1 : 2, rng: () => 0.5,
            steps: [
              { text: 'צלעות מקבילות לא נפגשות לעולם, גם אם ממשיכים אותן — כמו פסי רכבת.' },
              { text: `חפשי את הצלע שהולכת באותו כיוון כמו ${refName}.` },
              { text: `התשובה: ${correct}.` },
            ],
          });
        }

        // "Which side is parallel to X?" — none is, and visibly so.
        if (par.length === 0 && clearlyNoParallel && deg === NONE_ROTATION) {
          const swap = perp.length > 0 ? sideName(labels, perp[0]) : null;
          yield buildItem({
            itemId:        `G_PP_PAR_NONE_${shape.key}_${deg}_${ref}`,
            skillCode:     PP,
            question:      `איזו צלע מקבילה לצלע ${refName}?`,
            correct:       NO_SUCH_SIDE,
            signature:     swap,
            signatureCode: swap ? 'ERR_PARALLEL_PERP_SWAP' : null,
            distractors:   pool.filter(s => s !== NO_SUCH_SIDE && s !== swap),
            visual,
            cpaLayer:      'abstract', difficulty: 2, rng: () => 0.5,
            steps: [
              { text: 'צלעות מקבילות לא נפגשות לעולם, גם אם ממשיכים אותן — כמו פסי רכבת.' },
              { text: `המשיכי בדמיון כל צלע: כל אחת מהן תיפגש בסוף עם ${refName}.` },
              { text: `אין צלע שהולכת באותו כיוון כמו ${refName} — התשובה: ${NO_SUCH_SIDE}.` },
            ],
          });
        }

        // "Which side is perpendicular to X?" — only when exactly one is.
        if (perp.length === 1) {
          const correct = sideName(labels, perp[0]);
          const swap    = par.length > 0 ? sideName(labels, par[0]) : null;
          yield buildItem({
            itemId:        `G_PP_PERP_${shape.key}_${deg}_${ref}`,
            skillCode:     PP,
            question:      `איזו צלע מאונכת לצלע ${refName}?`,
            correct,
            signature:     swap,
            signatureCode: swap ? 'ERR_PARALLEL_PERP_SWAP' : null,
            distractors:   pool.filter(s => s !== correct && s !== swap),
            visual,
            cpaLayer:      'abstract', difficulty: deg === 0 ? 2 : 3, rng: () => 0.5,
            steps: [
              { text: 'צלעות מאונכות נפגשות בזווית ישרה — כמו פינה של דף.' },
              { text: `חפשי את הצלע שיוצרת עם ${refName} פינה ישרה.` },
              { text: `התשובה: ${correct}.` },
            ],
          });
        }

        // "Which side is perpendicular to X?" — none is, and visibly so.
        if (perp.length === 0 && clearlyNoPerp && deg === NONE_ROTATION) {
          const swap = par.length > 0 ? sideName(labels, par[0]) : null;
          yield buildItem({
            itemId:        `G_PP_PERP_NONE_${shape.key}_${deg}_${ref}`,
            skillCode:     PP,
            question:      `איזו צלע מאונכת לצלע ${refName}?`,
            correct:       NO_SUCH_SIDE,
            signature:     swap,
            signatureCode: swap ? 'ERR_PARALLEL_PERP_SWAP' : null,
            distractors:   pool.filter(s => s !== NO_SUCH_SIDE && s !== swap),
            visual,
            cpaLayer:      'abstract', difficulty: 3, rng: () => 0.5,
            steps: [
              { text: 'צלעות מאונכות נפגשות בזווית ישרה — כמו פינה של דף.' },
              { text: `הניחי פינה של דף על כל פינה של ${refName}: אף אחת לא מתאימה בדיוק.` },
              { text: `אין צלע שיוצרת עם ${refName} זווית ישרה — התשובה: ${NO_SUCH_SIDE}.` },
            ],
          });
        }
      }

      // "How many pairs of parallel sides?" — counted, not declared.
      let pairs = 0;
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (isParallel(pts, i, j)) pairs++;
      yield buildItem({
        itemId:        `G_PP_COUNT_${shape.key}_${deg}`,
        skillCode:     PP,
        question:      'כמה זוגות של צלעות מקבילות יש במצולע?',
        correct:       pairs, signature: null, signatureCode: null, distractors: [],
        visual:        { type: 'polygon', points: pts, labels },
        cpaLayer:      'abstract', difficulty: shape.key === 'hex' ? 3 : 2,
        answerMode:    'keypad', rng: () => 0.5,
        steps: [
          { text: 'עברי על כל צלע ובדקי: האם יש צלע אחרת שהולכת באותו כיוון בדיוק?' },
          { text: 'כמה זוגות מצאת?', answer: pairs },
        ],
      });
    }
  }
}

export function generateParallelPerp(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...parallelPerp()], opts);
}
