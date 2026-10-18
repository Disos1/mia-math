/**
 * Geometry booklet, units 3–8 (ה.ש.ב.ח.ה ד' "גאומטריה", pp. 31–224).
 *
 *   GEOM_RECT_SQUARE — מלבן וריבוע: properties, and the classification that
 *                      trips everyone up ("every square is a rectangle").
 *   GEOM_TRIANGLES   — משולשים: by sides, and by angles judged against a right
 *                      angle in a drawing. NOT the 180° angle sum: that is
 *                      grade 5, and the grade-4 book does not measure angles.
 *   GEOM_PERIMETER   — היקף מצולע (topic 6). The rectangle is topic 7, in
 *                      geometryBook.ts.
 *   GEOM_AREA        — שטח מלבן בסמ"ר, including area↔side both ways.
 *   GEOM_SYMMETRY    — סימטרייה שיקופית (topic 12); rotation is topic 13.
 *   GEOM_SOLIDS      — תיבה: faces, edges, vertices, nets (topic 14). Volume
 *                      has its own topics (17–20).
 *
 * Perimeter and area share one signature, ERR_PERIM_AREA_SWAP — applying the
 * other figure's formula. It is in the validated catalogue (formula swap), and
 * it is only claimed where the two give different numbers: for a 4×4 square the
 * perimeter and the area are both 16, and claiming a misconception there would
 * mark a correct answer as an error.
 */

import type { PracticeItem } from '../../../types';

type Pt = [number, number];
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { regularPolygon, rotateAndFit } from './geometry';
import { type Cell, bbox, fixedPolyominoes, foldCube, oppositeFace } from './gridUtils';

const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];

const rect = (w: number, h: number): Pt[] => [[0, 0], [w, 0], [w, h], [0, h]];

// ─── GEOM_RECT_SQUARE ────────────────────────────────────────────────────────

const RS = 'GEOM_RECT_SQUARE';

function* rectSquare(): Generator<PracticeItem> {
  // Naming the figure from the drawing, rotated so it is not recognised by pose.
  const figures: Array<{ key: string; name: string; pts: Pt[]; wrong: string[] }> = [
    { key: 'rect',   name: 'מלבן',    pts: rect(100, 60),  wrong: ['ריבוע', 'מקבילית', 'טרפז'] },
    { key: 'square', name: 'ריבוע',   pts: rect(80, 80),   wrong: ['מלבן', 'מעוין', 'טרפז'] },
    { key: 'para',   name: 'מקבילית', pts: [[20, 0], [100, 0], [80, 60], [0, 60]], wrong: ['מלבן', 'ריבוע', 'טרפז'] },
    { key: 'trap',   name: 'טרפז',    pts: [[25, 0], [75, 0], [100, 60], [0, 60]], wrong: ['מקבילית', 'מלבן', 'ריבוע'] },
  ];
  for (const f of figures) {
    for (const deg of [0, 35, 70]) {
      yield buildItem({
        itemId: `G_RS_NAME_${f.key}_${deg}`, skillCode: RS,
        question: 'איזו צורה זו?',
        correct: f.name, signature: null, signatureCode: null,
        distractors: f.wrong, exactOptions: true,
        visual: { type: 'polygon', points: rotateAndFit(f.pts, deg), labels: LETTERS.slice(0, f.pts.length) },
        cpaLayer: 'abstract', difficulty: deg === 0 ? 1 : 2, rng: () => 0.5,
        steps: [
          { text: 'בודקים את הצלעות: אילו מהן שוות? אילו מקבילות?' },
          { text: 'ואז את הזוויות: האם יש פינות ישרות?' },
          { text: `הצורה הזו היא ${f.name}.` },
        ],
      });
    }
  }

  // Classification — "every square is a rectangle" is true, the reverse is not.
  const claims: Array<[string, string]> = [
    ['כל ריבוע הוא מלבן', 'נכון'],
    ['כל מלבן הוא ריבוע', 'לא נכון'],
    ['בכל מלבן יש ארבע זוויות ישרות', 'נכון'],
    ['בכל ריבוע כל הצלעות שוות באורכן', 'נכון'],
    ['במלבן כל הצלעות שוות באורכן', 'לא נכון'],
    ['בכל מלבן יש שני זוגות של צלעות מקבילות', 'נכון'],
    ['לכל מקבילית יש ארבע זוויות ישרות', 'לא נכון'],
    ['כל ריבוע הוא גם מקבילית', 'נכון'],
    ['אלכסוני המלבן שווים באורכם', 'נכון'],
    ['בכל טרפז שני זוגות צלעות מקבילות', 'לא נכון'],
  ];
  for (const [claim, answer] of claims) {
    yield buildItem({
      itemId: `G_RS_CLAIM_${claims.findIndex(c => c[0] === claim)}`, skillCode: RS,
      question: `${claim} — נכון או לא נכון?`,
      correct: answer, signature: null, signatureCode: null,
      distractors: [answer === 'נכון' ? 'לא נכון' : 'נכון'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'מלבן = ארבע זוויות ישרות. ריבוע = מלבן שגם כל צלעותיו שוות.' },
        { text: `לכן המשפט ${answer}.` },
      ],
    });
  }

  // Opposite sides, and the side you get back from the perimeter — swept.
  for (let w = 4; w <= 40; w += 2) {
    // A square hiding inside the question: same side twice. Once per w — it
    // does not depend on h, and repeating it per h was the same question with
    // a different id, which inflates the pool without adding a question.
    if (w % 4 === 0) {
      yield buildItem({
        itemId: `G_RS_SQ_${w}`, skillCode: RS,
        question: `למרובע ארבע זוויות ישרות וכל צלעותיו באורך ${w} ס"מ. איזו צורה זו?`,
        correct: 'ריבוע', signature: 'מלבן שאינו ריבוע', signatureCode: null,
        distractors: ['מקבילית', 'טרפז'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [{ text: 'זוויות ישרות וכל הצלעות שווות — זה ריבוע.' }],
      });
    }
    for (let h = 3; h < w; h += 3) {
      yield buildItem({
        itemId: `G_RS_OPP_${w}_${h}`, skillCode: RS,
        question: `במלבן צלע אחת באורך ${w} ס"מ והצלע שלידה ${h} ס"מ. מה אורך הצלע שמול הצלע בת ${w} ס"מ?`,
        correct: w, signature: h, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'במלבן צלעות נגדיות שוות באורכן.' },
                { text: 'אז מה אורך הצלע שמולה?', answer: w }],
      });

    }
  }
}

// ─── GEOM_TRIANGLES ──────────────────────────────────────────────────────────

const TR = 'GEOM_TRIANGLES';

function* triangles(): Generator<PracticeItem> {
  const sideNames  = ['משולש שווה-צלעות', 'משולש שווה-שוקיים', 'משולש שונה-צלעות'];
  const angleNames = ['משולש ישר-זווית', 'משולש חד-זוויות', 'משולש קהה-זווית'];

  // By sides — every triple that can actually close into a triangle.
  for (let a = 3; a <= 12; a++) {
    for (let b = a; b <= 12; b++) {
      for (let c = b; c <= 12; c++) {
        if (a + b <= c) continue;               // triangle inequality
        const equal = (a === b ? 1 : 0) + (b === c ? 1 : 0) + (a === c ? 1 : 0);
        const name  = equal === 3 ? sideNames[0] : equal >= 1 ? sideNames[1] : sideNames[2];
        yield buildItem({
          itemId: `G_TR_SIDES_${a}_${b}_${c}`, skillCode: TR,
          question: `צלעות המשולש הן ${a} ס"מ, ${b} ס"מ ו-${c} ס"מ. איזה משולש זה?`,
          correct: name, signature: null, signatureCode: null,
          distractors: sideNames.filter(n => n !== name), exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: 'סופרים כמה צלעות שוות: שלוש — שווה-צלעות, שתיים — שווה-שוקיים, אף אחת — שונה-צלעות.' },
            { text: `כאן: ${name}.` },
          ],
        });
      }
    }
  }

  // By angles, from a DRAWING — the book's way: compare each angle with a right
  // angle (the corner of a page). A right angle is marked with its small square;
  // every other angle is built at least 15° away from right, so it is never a
  // judgement call.
  const angleAt = (P: Pt[], i: number) => {
    const p = P[i], a = P[(i + 1) % 3], b = P[(i + 2) % 3];
    const u = [a[0] - p[0], a[1] - p[1]], v = [b[0] - p[0], b[1] - p[1]];
    return (Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) * 180) / Math.PI;
  };
  for (let bx = 50; bx <= 100; bx += 10) {
    // The apex swept left to right, plus the two places it makes a right angle.
    const apexes = new Set([-30, -14, 2, 18, 34, 50, 66, 82, 98, 114, 130, 0, bx]);
    for (const cx of apexes) {
      for (const cy of [45, 70]) {
        const P: Pt[] = [[0, 0], [bx, 0], [cx, cy]];
        const ang = [0, 1, 2].map(i => angleAt(P, i));
        const right = ang.findIndex(x => Math.abs(x - 90) < 0.5);
        if (right < 0 && ang.some(x => Math.abs(x - 90) < 15)) continue;     // too close to call
        if (ang.some(x => x < 12)) continue;                                  // a sliver, not a triangle
        const max  = Math.max(...ang);
        const name = right >= 0 ? angleNames[0] : max > 90 ? angleNames[2] : angleNames[1];
        for (const deg of [0, 140]) {
          yield buildItem({
            itemId: `G_TR_DRAWN_${bx}_${cx}_${cy}_${deg}`, skillCode: TR,
            question: 'איזה משולש זה לפי הזוויות שלו?',
            correct: name, signature: null, signatureCode: null,
            distractors: angleNames.filter(n => n !== name), exactOptions: true,
            visual: { type: 'polygon', points: rotateAndFit(P, deg), labels: LETTERS.slice(0, 3),
                      rightAngleAt: right >= 0 ? [right] : [] },
            cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
            steps: [
              { text: 'משווים כל זווית לזווית ישרה (כמו פינה של דף). הריבוע הקטן מסמן זווית ישרה.' },
              { text: 'יש זווית ישרה — ישר-זווית. יש זווית גדולה מישרה — קהה-זווית. כל הזוויות קטנות מישרה — חד-זוויות.' },
              { text: `כאן: ${name}.` },
            ],
          });
        }
      }
    }
  }

  // Both at once, drawn: an isosceles triangle can be right, acute or obtuse.
  for (let half = 20; half <= 50; half += 5) {
    for (const [h, kind] of [[half, 0], [half * 2 + 10, 1], [Math.round(half / 3), 2]] as const) {
      if (h < 8) continue;
      const P: Pt[] = [[0, h], [2 * half, h], [half, 0]];
      const name = `${angleNames[kind]} ושווה-שוקיים`;
      const wrong = [`${angleNames[(kind + 1) % 3]} ושווה-שוקיים`, `${angleNames[kind]} ושונה-צלעות`, `${angleNames[kind]} ושווה-צלעות`];
      for (const deg of [0, 200]) {
        yield buildItem({
          itemId: `G_TR_BOTH_${half}_${kind}_${deg}`, skillCode: TR,
          question: 'שתי הצלעות המסומנות בצבע שוות באורכן. איזה משולש זה?',
          correct: name, signature: null, signatureCode: null, distractors: wrong, exactOptions: true,
          visual: { type: 'polygon', points: rotateAndFit(P, deg), labels: LETTERS.slice(0, 3),
                    highlightSides: [1, 2], rightAngleAt: kind === 0 ? [2] : [] },
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: 'לפי הצלעות: שתי צלעות שוות — שווה-שוקיים.' },
            { text: `לפי הזווית שבין שתי הצלעות השוות: ${kind === 0 ? 'ישרה' : kind === 1 ? 'חדה' : 'קהה'}.` },
            { text: `ביחד: ${name}.` },
          ],
        });
      }
    }
  }

  // Classification claims — "every equilateral triangle is isosceles" is the
  // one that matters, the same idea as "every square is a rectangle".
  const claims: Array<[string, string]> = [
    ['כל משולש שווה-צלעות הוא גם שווה-שוקיים', 'נכון'],
    ['כל משולש שווה-שוקיים הוא גם שווה-צלעות', 'לא נכון'],
    ['יש משולש ישר-זווית שהוא גם שווה-שוקיים', 'נכון'],
    ['יש משולש ישר-זווית שהוא גם שווה-צלעות', 'לא נכון'],
    ['יש משולש עם שתי זוויות ישרות', 'לא נכון'],
    ['יש משולש עם שתי זוויות קהות', 'לא נכון'],
    ['בכל משולש יש לפחות שתי זוויות חדות', 'נכון'],
    ['במשולש שווה-צלעות כל הזוויות חדות', 'נכון'],
    ['יש משולש קהה-זווית שהוא גם שווה-שוקיים', 'נכון'],
    ['יש משולש שונה-צלעות שהוא ישר-זווית', 'נכון'],
    ['במשולש שווה-שוקיים יש שתי זוויות שוות', 'נכון'],
    ['במשולש שווה-צלעות כל הזוויות שוות', 'נכון'],
  ];
  for (const [i, [claim, answer]] of claims.entries()) {
    yield buildItem({
      itemId: `G_TR_CLAIM_${i}`, skillCode: TR,
      question: `${claim} — נכון או לא נכון?`,
      correct: answer, signature: null, signatureCode: null,
      distractors: [answer === 'נכון' ? 'לא נכון' : 'נכון'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'שווה-צלעות הוא מקרה מיוחד של שווה-שוקיים — כמו שריבוע הוא מקרה מיוחד של מלבן.' },
        { text: `לכן המשפט ${answer}.` },
      ],
    });
  }
}

// ─── GEOM_PERIMETER ──────────────────────────────────────────────────────────

const PE = 'GEOM_PERIMETER';

function* perimeter(): Generator<PracticeItem> {
  // A regular polygon: one side, many times.
  for (const n of [3, 5, 6, 8]) {
    for (let side = 3; side <= 20; side += 2) {
      yield buildItem({
        itemId: `G_PE_POLY_${n}_${side}`, skillCode: PE,
        question: `למצולע משוכלל ${n} צלעות, וכל צלע באורך ${side} ס"מ. מה ההיקף בס"מ?`,
        correct: n * side, signature: n + side, signatureCode: null, distractors: [],
        visual: { type: 'polygon', points: regularPolygon(n), labels: LETTERS.slice(0, Math.min(n, LETTERS.length)) },
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'במצולע משוכלל כל הצלעות שוות באורכן.' },
          { text: `${n} × ${side} = ?`, answer: n * side },
        ],
      });
    }
  }

  // An irregular polygon: add every side — the slip is to miss one.
  const SHAPES: Array<{ n: number; pts: Pt[] }> = [
    { n: 3, pts: [[0, 80], [100, 80], [35, 0]] },
    { n: 4, pts: [[10, 0], [90, 15], [100, 80], [0, 70]] },
    { n: 5, pts: [[50, 0], [100, 35], [80, 100], [15, 90], [0, 30]] },
    { n: 6, pts: [[25, 0], [80, 5], [100, 50], [75, 100], [20, 90], [0, 45]] },
  ];
  for (const { n, pts } of SHAPES) {
    for (let base = 3; base <= 12; base++) {
      for (const step of [1, 2, 3]) {
        const sides = Array.from({ length: n }, (_, i) => base + ((i * step * 3) % 7));
        const p = sides.reduce((x, y) => x + y, 0);
        const labels = LETTERS.slice(0, n);
        // Lengths sit beside their sides, as in the book. Written into the
        // question as "אב = 4, בג = 6" they reached her scrambled by RTL.
        yield buildItem({
          itemId: `G_PE_IRR_${n}_${base}_${step}`, skillCode: PE,
          question: 'ליד כל צלע כתוב האורך שלה בס"מ. מה היקף המצולע בס"מ?',
          correct: p, signature: p - sides[n - 1], signatureCode: null, distractors: [],
          visual: { type: 'polygon', points: pts, labels, sideLabels: sides.map(String) },
          cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `סופרים צלעות: ${n}. מחברים את כולן — עוברים מסביב עד שחוזרים לקודקוד ${labels[0]}.` },
            { text: `${sides.join(' + ')} = ?`, answer: p },
          ],
        });
        // Backwards: the perimeter is known, one side is missing.
        const known = sides.slice(0, -1);
        yield buildItem({
          itemId: `G_PE_MISS_${n}_${base}_${step}`, skillCode: PE,
          question: `היקף המצולע ${p} ס"מ. ליד כל צלע כתוב האורך שלה בס"מ. מה אורך הצלע שלידה כתוב סימן שאלה?`,
          correct: sides[n - 1], signature: null, signatureCode: null, distractors: [],
          visual: { type: 'polygon', points: pts, labels, highlightSides: [n - 1], sideLabels: [...known.map(String), '?'] },
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `סכום הצלעות הידועות: ${known.join(' + ')} = ?`, answer: p - sides[n - 1] },
            { text: `מה שחסר עד ההיקף: ${p} − ${p - sides[n - 1]} = ?`, answer: sides[n - 1] },
          ],
        });
      }
    }
  }

  // An equilateral triangle from its perimeter.
  for (let side = 3; side <= 25; side++) {
    yield buildItem({
      itemId: `G_PE_EQTRI_${side}`, skillCode: PE,
      question: `היקף משולש שווה-צלעות הוא ${side * 3} ס"מ. מה אורך כל צלע?`,
      correct: side, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'שלוש צלעות שוות — מחלקים את ההיקף ל-3.' }, { text: `${side * 3} ÷ 3 = ?`, answer: side }],
    });
  }
}

// ─── GEOM_AREA ───────────────────────────────────────────────────────────────

const AR = 'GEOM_AREA';

function* area(): Generator<PracticeItem> {
  for (let w = 4; w <= 30; w += 2) {
    for (let h = 2; h < w; h += 2) {
      const a = w * h, p = 2 * (w + h);
      yield buildItem({
        itemId: `G_AR_RECT_${w}_${h}`, skillCode: AR,
        question: `מלבן שאורכו ${w} ס"מ ורוחבו ${h} ס"מ. מה השטח שלו בסמ"ר?`,
        correct: a,
        signature: String(p).length <= String(a).length + 1 ? p : null,
        signatureCode: String(p).length <= String(a).length + 1 ? 'ERR_PERIM_AREA_SWAP' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        visual: { type: 'polygon', points: rect(100, Math.round((h / w) * 100)), labels: LETTERS.slice(0, 4) },
        steps: [
          { text: 'שטח = כמה ריבועים של סנטימטר על סנטימטר ממלאים את הצורה.' },
          { text: `יש ${h} שורות, ובכל שורה ${w} ריבועים: ${w} × ${h} = ?`, answer: a },
        ],
      });

      // Backwards: area and one side.
      yield buildItem({
        itemId: `G_AR_BACK_${w}_${h}`, skillCode: AR,
        question: `שטח מלבן הוא ${a} סמ"ר ואורכו ${w} ס"מ. מה רוחבו בס"מ?`,
        correct: h,
        signature: String(a - w).length <= String(h).length + 1 ? a - w : null, signatureCode: null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'שטח = אורך × רוחב, אז הרוחב הוא השטח חלקי האורך.' },
          { text: `${a} ÷ ${w} = ?`, answer: h },
        ],
      });
    }
  }

  for (let side = 3; side <= 25; side++) {
    const a = side * side, p = 4 * side;
    yield buildItem({
      itemId: `G_AR_SQ_${side}`, skillCode: AR,
      question: `ריבוע שאורך צלעו ${side} ס"מ. מה השטח שלו בסמ"ר?`,
      correct: a,
      signature: p !== a && String(p).length <= String(a).length + 1 ? p : null,
      signatureCode: p !== a && String(p).length <= String(a).length + 1 ? 'ERR_PERIM_AREA_SWAP' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `בריבוע האורך והרוחב שווים: ${side} × ${side} = ?`, answer: a }],
    });
  }

}

// ─── GEOM_SYMMETRY ───────────────────────────────────────────────────────────

const SY = 'GEOM_SYMMETRY';

function* symmetry(): Generator<PracticeItem> {
  const named: Array<[string, number]> = [
    ['ריבוע', 4], ['מלבן', 2], ['משולש שווה-צלעות', 3], ['משולש שווה-שוקיים', 1],
    ['מקבילית', 0], ['טרפז שווה-שוקיים', 1], ['משולש שונה-צלעות', 0], ['מעוין', 2],
  ];
  // A regular polygon has exactly as many axes as sides — the rule behind the list.
  const REG: Record<number, string> = {
    3: 'משולש משוכלל', 4: 'ריבוע', 5: 'מחומש משוכלל', 6: 'משושה משוכלל',
    7: 'משובע משוכלל', 8: 'מתומן משוכלל', 9: 'מתושע משוכלל', 10: 'מעושר משוכלל',
    12: 'מצולע משוכלל בעל 12 צלעות',
  };
  // A square is in both lists; deduping keeps item ids unique.
  const all: Array<[string, number]> = [...named];
  for (const [n, name] of Object.entries(REG)) {
    if (!all.some(([existing]) => existing === name)) all.push([name, Number(n)]);
  }

  for (const [name, n] of all) {
    yield buildItem({
      itemId: `G_SY_AXES_${name}`, skillCode: SY,
      question: `כמה צירי סימטריה יש ב${name}?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: n === 0 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'ציר סימטריה הוא קו שאם מקפלים עליו, שני החלקים מתאימים בדיוק.' },
        { text: `ב${name} יש ${n} קווים כאלה.`, answer: n },
      ],
    });
  }

  // On squared paper: is the dashed line a line of symmetry, and how many squares
  // complete the picture. Patterns are swept from bit masks of the left half.
  const W = 3, H = 4;
  for (let mask = 7; mask < 1 << (W * H); mask += 37) {
    const half: Cell[] = [];
    for (let b = 0; b < W * H; b++) if (mask & (1 << b)) half.push([b % W, Math.floor(b / W)]);
    if (half.length < 3 || half.length > 8) continue;
    const mirror = half.map(([x, y]) => [2 * W - 1 - x, y] as Cell);
    const full = [...half, ...mirror];
    // A near-miss: one mirrored square shifted down a row (when it lands on an empty square).
    const moved = mirror.map(c => c.join(','));
    const victim = mirror.find(([x, y]) => y + 1 < H && !moved.includes(`${x},${y + 1}`));
    const broken = victim ? [...half, ...mirror.filter(c => c !== victim), [victim[0], victim[1] + 1] as Cell] : null;

    yield buildItem({
      itemId: `G_SY_GRIDYES_${mask}`, skillCode: SY,
      question: 'האם הקו המקווקו הוא ציר סימטריה של הצורה?',
      correct: 'כן', signature: null, signatureCode: null, distractors: ['לא'], exactOptions: true,
      visual: { type: 'grid_shape', cols: 2 * W, rows: H, cells: full, axis: { x: W } },
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: 'מקפלים בדמיון על הקו: כל משבצת צריכה ליפול על משבצת צבועה בצד השני, באותו מרחק מהקו.' }],
    });
    if (broken) {
      yield buildItem({
        itemId: `G_SY_GRIDNO_${mask}`, skillCode: SY,
        question: 'האם הקו המקווקו הוא ציר סימטריה של הצורה?',
        correct: 'לא', signature: null, signatureCode: null, distractors: ['כן'], exactOptions: true,
        visual: { type: 'grid_shape', cols: 2 * W, rows: H, cells: broken, axis: { x: W } },
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [{ text: 'מקפלים על הקו ובודקים משבצת-משבצת. יש משבצת אחת שלא נופלת על בת-זוג.' }],
      });
    }
    // Complete the picture: some mirrored squares are missing.
    const missing = mirror.filter((_, i) => (i + mask) % 2 === 0);
    if (missing.length >= 1) {
      yield buildItem({
        itemId: `G_SY_GRIDADD_${mask}`, skillCode: SY,
        question: 'כמה משבצות עוד צריך לצבוע כדי שהקו המקווקו יהיה ציר סימטריה של הצורה?',
        correct: missing.length, signature: null, signatureCode: null, distractors: [],
        visual: { type: 'grid_shape', cols: 2 * W, rows: H, cells: full.filter(c => !missing.includes(c)), axis: { x: W } },
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'לכל משבצת בצד שמאל מחפשים את בת-הזוג שלה בצד ימין, באותה שורה ובאותו מרחק מהקו.' },
                { text: 'סופרים את בנות-הזוג שחסרות:', answer: missing.length }],
      });
    }
  }

  // Which shape has exactly k axes? — the same fact, asked backwards.
  for (const [name, n] of all) {
    if (n === 0) continue;
    const others = all.filter(([, m]) => m !== n).slice(0, 3).map(([nm]) => nm);
    yield buildItem({
      itemId: `G_SY_WHICH_${name}`, skillCode: SY,
      question: `לאיזו צורה יש בדיוק ${n} צירי סימטריה?`,
      correct: name, signature: null, signatureCode: null,
      distractors: others, exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [{ text: `במצולע משוכלל מספר צירי הסימטריה שווה למספר הצלעות.` }],
    });
  }
}

// ─── GEOM_SOLIDS ─────────────────────────────────────────────────────────────

const SO = 'GEOM_SOLIDS';

function* solids(): Generator<PracticeItem> {
  const facts: Array<[string, string, number]> = [
    ['תיבה', 'פאות', 6], ['תיבה', 'מקצועות', 12], ['תיבה', 'קודקודים', 8],
    ['קובייה', 'פאות', 6], ['קובייה', 'מקצועות', 12], ['קודקודים בקובייה', 'קודקודים', 8],
  ];
  for (const [solid, part, n] of facts) {
    yield buildItem({
      itemId: `G_SO_FACT_${solid}_${part}`, skillCode: SO,
      question: `כמה ${part} יש ל${solid.startsWith('קודקודים') ? 'קובייה' : solid}?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'פאה היא צד שלם, מקצוע הוא הקו שבין שתי פאות, וקודקוד הוא פינה.' },
              { text: `התשובה: ${n}.`, answer: n }],
    });
  }

  // How many faces of each size — reading a drawn box.
  for (let l = 2; l <= 9; l++) {
    for (let w = 2; w <= l; w++) {
      for (let h = 2; h <= 7; h++) {
        if ((l + w + h) % 3 !== 0) continue;
        const kind = (a: number, b: number) => `${Math.max(a, b)}x${Math.min(a, b)}`;
        const same = [kind(l, w), kind(l, h), kind(w, h)].filter(k => k === kind(l, w)).length * 2;
        yield buildItem({
          itemId: `G_SO_FACES_${l}_${w}_${h}`, skillCode: SO,
          question: `לכמה פאות בתיבה יש בדיוק אותו גודל כמו לפאה ${l} על ${w} ס"מ (כולל היא עצמה)?`,
          correct: same, signature: same === 2 ? 1 : 2, signatureCode: null, distractors: [],
          visual: { type: 'box', l, w, h, dims: { unit: 'ס"מ' } },
          cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'בתיבה הפאות באות בזוגות: כל פאה שווה לפאה שמולה.' },
            { text: same === 2 ? 'כאן רק הפאה הזו והפאה שמולה.' : 'כאן יש עוד זוג פאות באותו גודל.', answer: same },
          ],
        });
      }
    }
  }

  // Nets of a cube — found, not listed: every six-square shape is folded by
  // rolling a cube across it (gridUtils.foldCube).
  const hexes = fixedPolyominoes(6);
  const nets = hexes.filter(c => foldCube(c));
  const notNets = hexes.filter(c => !foldCube(c));
  // As many shapes that fold as that do not, so "yes" is not the safe guess.
  const chosenNo = notNets.filter((_, i) => i % Math.max(1, Math.floor(notNets.length / nets.length)) === 0).slice(0, nets.length);
  for (const [i, cells] of [...nets.map(c => [c, true] as const), ...chosenNo.map(c => [c, false] as const)].entries()) {
    const [shape, folds] = cells;
    const { cols, rows } = bbox(shape);
    yield buildItem({
      itemId: `G_SO_NET_${folds ? 'Y' : 'N'}_${i}`, skillCode: SO,
      question: 'האם אפשר לקפל את הפריסה הזו לקובייה?',
      correct: folds ? 'כן' : 'לא', signature: null, signatureCode: null,
      distractors: [folds ? 'לא' : 'כן'], exactOptions: true,
      visual: { type: 'grid_shape', cols, rows, cells: shape },
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'מדמיינים: אחת המשבצות היא הבסיס, ומקפלים את השאר למעלה סביבה.' },
        { text: folds ? 'כל משבצת נופלת על פאה אחרת — יוצאת קובייה.' : 'שתי משבצות נופלות על אותה פאה (או שנשאר חור) — אין קובייה.' },
      ],
    });
  }
  // Opposite faces on a net.
  for (const [i, shape] of nets.entries()) {
    if (i % 2 === 1) continue;
    const faces = foldCube(shape)!;
    const labels = LETTERS.slice(0, 6);
    const ask = i % 6;
    const opp = faces.findIndex(f => f === oppositeFace(faces[ask]));
    const wrong = labels.filter((_, k) => k !== ask && k !== opp).slice(0, 3);
    const { cols, rows } = bbox(shape);
    yield buildItem({
      itemId: `G_SO_OPP_${i}`, skillCode: SO,
      question: `מקפלים את הפריסה לקובייה. איזו אות תהיה על הפאה שמול הפאה עם האות ${labels[ask]}?`,
      correct: labels[opp], signature: null, signatureCode: null, distractors: wrong, exactOptions: true,
      visual: { type: 'grid_shape', cols, rows, cells: shape, cellLabels: labels },
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'פאות נגדיות אף פעם לא נוגעות זו בזו בפריסה.' },
        { text: 'בשורה של שלוש משבצות, הראשונה והשלישית נגדיות.' },
        { text: `מול האות ${labels[ask]} תהיה האות ${labels[opp]}.` },
      ],
    });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateRectSquare = (o: GenerateOpts) => take(rectSquare(), o);
export const generateTriangles  = (o: GenerateOpts) => take(triangles(), o);
export const generatePerimeter  = (o: GenerateOpts) => take(perimeter(), o);
export const generateArea       = (o: GenerateOpts) => take(area(), o);
export const generateSymmetry   = (o: GenerateOpts) => take(symmetry(), o);
export const generateSolids     = (o: GenerateOpts) => take(solids(), o);
