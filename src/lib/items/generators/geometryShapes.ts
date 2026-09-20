/**
 * Geometry booklet, units 3–8 (ה.ש.ב.ח.ה ד' "גאומטריה", pp. 31–224).
 *
 *   GEOM_RECT_SQUARE — מלבן וריבוע: properties, and the classification that
 *                      trips everyone up ("every square is a rectangle").
 *   GEOM_TRIANGLES   — משולשים: by sides, by angles, and the 180° rule.
 *   GEOM_PERIMETER   — היקף מצולע והיקף מלבן.
 *   GEOM_AREA        — שטח בסמ"ר, including area↔side both ways.
 *   GEOM_SYMMETRY    — סימטריה שיקופית וסיבובית.
 *   GEOM_SOLIDS      — תיבות ונפח: faces, edges, vertices, volume in סמ"ק.
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

  // Opposite sides — the property she will lean on for perimeter.
  for (const [w, h] of [[8, 5], [12, 7], [9, 4], [15, 6], [20, 11], [7, 3]]) {
    yield buildItem({
      itemId: `G_RS_OPP_${w}_${h}`, skillCode: RS,
      question: `במלבן צלע אחת באורך ${w} ס"מ. מה אורך הצלע שמולה?`,
      correct: w, signature: h, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'במלבן צלעות נגדיות שוות באורכן.' }, { text: 'אז מה אורך הצלע שמולה?', answer: w }],
    });
  }
}

// ─── GEOM_TRIANGLES ──────────────────────────────────────────────────────────

const TR = 'GEOM_TRIANGLES';

function* triangles(): Generator<PracticeItem> {
  // By sides.
  const bySides: Array<[number, number, number, string]> = [
    [5, 5, 5, 'משולש שווה-צלעות'], [6, 6, 6, 'משולש שווה-צלעות'],
    [7, 7, 4, 'משולש שווה-שוקיים'], [5, 8, 8, 'משולש שווה-שוקיים'], [9, 4, 9, 'משולש שווה-שוקיים'],
    [4, 5, 6, 'משולש שונה-צלעות'], [7, 8, 10, 'משולש שונה-צלעות'], [3, 5, 7, 'משולש שונה-צלעות'],
  ];
  const sideNames = ['משולש שווה-צלעות', 'משולש שווה-שוקיים', 'משולש שונה-צלעות'];
  for (const [a, b, c, name] of bySides) {
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

  // By angles.
  const byAngles: Array<[number, number, number, string]> = [
    [90, 45, 45, 'משולש ישר-זווית'], [90, 60, 30, 'משולש ישר-זווית'], [90, 70, 20, 'משולש ישר-זווית'],
    [60, 60, 60, 'משולש חד-זוויות'], [70, 60, 50, 'משולש חד-זוויות'], [80, 55, 45, 'משולש חד-זוויות'],
    [120, 30, 30, 'משולש קהה-זווית'], [100, 50, 30, 'משולש קהה-זווית'], [110, 40, 30, 'משולש קהה-זווית'],
  ];
  const angleNames = ['משולש ישר-זווית', 'משולש חד-זוויות', 'משולש קהה-זווית'];
  for (const [a, b, c, name] of byAngles) {
    yield buildItem({
      itemId: `G_TR_ANGLES_${a}_${b}_${c}`, skillCode: TR,
      question: `זוויות המשולש הן ${a}°, ${b}° ו-${c}°. איזה משולש זה?`,
      correct: name, signature: null, signatureCode: null,
      distractors: angleNames.filter(n => n !== name), exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'זווית ישרה היא 90°. גדולה ממנה — קהה, קטנה ממנה — חדה.' },
        { text: `הזווית הגדולה כאן היא ${a}°, ולכן זה ${name}.` },
      ],
    });
  }

  // The 180° rule.
  for (const [a, b] of [[40, 60], [90, 35], [50, 50], [100, 25], [70, 70], [30, 90], [45, 65], [80, 20], [110, 30], [25, 25]]) {
    yield buildItem({
      itemId: `G_TR_SUM_${a}_${b}`, skillCode: TR,
      question: `במשולש יש זוויות של ${a}° ו-${b}°. כמה מעלות הזווית השלישית?`,
      correct: 180 - a - b,
      signature: 360 - a - b,            // uses the quadrilateral's 360°
      signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'סכום הזוויות בכל משולש הוא 180°.' },
        { text: `${a} + ${b} = ?`, answer: a + b },
        { text: `180 − ${a + b} = ?`, answer: 180 - a - b },
      ],
    });
  }
}

// ─── GEOM_PERIMETER ──────────────────────────────────────────────────────────

const PE = 'GEOM_PERIMETER';

function* perimeter(): Generator<PracticeItem> {
  for (const [w, h] of [[8, 5], [12, 7], [9, 4], [15, 6], [20, 11], [7, 3], [10, 6], [14, 9], [11, 5], [6, 4]]) {
    const p = 2 * (w + h), area = w * h;
    yield buildItem({
      itemId: `G_PE_RECT_${w}_${h}`, skillCode: PE,
      question: `מלבן שאורכו ${w} ס"מ ורוחבו ${h} ס"מ. מה ההיקף שלו בס"מ?`,
      correct: p,
      signature: area !== p ? area : null,       // multiplied instead of adding
      signatureCode: area !== p ? 'ERR_PERIM_AREA_SWAP' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      visual: { type: 'polygon', points: rect(100, Math.round((h / w) * 100)), labels: LETTERS.slice(0, 4) },
      steps: [
        { text: 'היקף = כמה דרך עוברים מסביב לצורה — מחברים את כל הצלעות.' },
        { text: `במלבן שתי צלעות באורך ${w} ושתיים באורך ${h}: ${w} + ${h} = ?`, answer: w + h },
        { text: `וכפול 2: ${w + h} × 2 = ?`, answer: p },
      ],
    });
  }

  for (const side of [4, 6, 7, 9, 12, 15, 20, 25]) {
    const p = 4 * side;
    yield buildItem({
      itemId: `G_PE_SQ_${side}`, skillCode: PE,
      question: `ריבוע שאורך צלעו ${side} ס"מ. מה ההיקף שלו בס"מ?`,
      correct: p,
      signature: side * side !== p ? side * side : null,
      signatureCode: side * side !== p ? 'ERR_PERIM_AREA_SWAP' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'בריבוע כל ארבע הצלעות שוות.' },
        { text: `${side} × 4 = ?`, answer: p },
      ],
    });
  }

  // Backwards: perimeter given, find the missing side.
  for (const [w, h] of [[8, 5], [12, 7], [9, 4], [15, 6], [10, 6], [14, 9]]) {
    yield buildItem({
      itemId: `G_PE_BACK_${w}_${h}`, skillCode: PE,
      question: `היקף מלבן הוא ${2 * (w + h)} ס"מ, ואורכו ${w} ס"מ. מה רוחבו בס"מ?`,
      correct: h, signature: 2 * (w + h) - w, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `ההיקף הוא שני אורכים ושני רוחבים. קודם מורידים את שני האורכים: ${2 * (w + h)} − ${2 * w} = ?`, answer: 2 * h },
        { text: `מה שנשאר הוא שני רוחבים: ${2 * h} ÷ 2 = ?`, answer: h },
      ],
    });
  }

  // A polygon that is not a rectangle — perimeter is still "add the sides".
  for (const n of [3, 5, 6]) {
    for (const side of [4, 7, 9]) {
      yield buildItem({
        itemId: `G_PE_POLY_${n}_${side}`, skillCode: PE,
        question: `למצולע משוכלל ${n} צלעות, וכל צלע באורך ${side} ס"מ. מה ההיקף בס"מ?`,
        correct: n * side, signature: null, signatureCode: null, distractors: [],
        visual: { type: 'polygon', points: regularPolygon(n), labels: LETTERS.slice(0, n) },
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'במצולע משוכלל כל הצלעות שוות באורכן.' },
          { text: `${n} × ${side} = ?`, answer: n * side },
        ],
      });
    }
  }
}

// ─── GEOM_AREA ───────────────────────────────────────────────────────────────

const AR = 'GEOM_AREA';

function* area(): Generator<PracticeItem> {
  for (const [w, h] of [[8, 5], [12, 7], [9, 4], [15, 6], [20, 11], [7, 3], [10, 6], [14, 9], [11, 5], [6, 4], [13, 8]]) {
    const a = w * h, p = 2 * (w + h);
    yield buildItem({
      itemId: `G_AR_RECT_${w}_${h}`, skillCode: AR,
      question: `מלבן שאורכו ${w} ס"מ ורוחבו ${h} ס"מ. מה השטח שלו בסמ"ר?`,
      correct: a,
      signature: p !== a ? p : null,                 // added instead of multiplying
      signatureCode: p !== a ? 'ERR_PERIM_AREA_SWAP' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      visual: { type: 'polygon', points: rect(100, Math.round((h / w) * 100)), labels: LETTERS.slice(0, 4) },
      steps: [
        { text: 'שטח = כמה ריבועים של סנטימטר על סנטימטר ממלאים את הצורה.' },
        { text: `יש ${h} שורות, ובכל שורה ${w} ריבועים: ${w} × ${h} = ?`, answer: a },
      ],
    });
  }

  for (const side of [3, 5, 6, 8, 9, 11, 12, 15]) {
    const a = side * side, p = 4 * side;
    yield buildItem({
      itemId: `G_AR_SQ_${side}`, skillCode: AR,
      question: `ריבוע שאורך צלעו ${side} ס"מ. מה השטח שלו בסמ"ר?`,
      correct: a,
      signature: p !== a ? p : null,
      signatureCode: p !== a ? 'ERR_PERIM_AREA_SWAP' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `בריבוע האורך והרוחב שווים: ${side} × ${side} = ?`, answer: a }],
    });
  }

  // Backwards: area and one side.
  for (const [w, h] of [[8, 5], [12, 7], [9, 4], [10, 6], [14, 9], [6, 4]]) {
    yield buildItem({
      itemId: `G_AR_BACK_${w}_${h}`, skillCode: AR,
      question: `שטח מלבן הוא ${w * h} סמ"ר ואורכו ${w} ס"מ. מה רוחבו בס"מ?`,
      correct: h, signature: w * h - w, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'שטח = אורך × רוחב, אז הרוחב הוא השטח חלקי האורך.' },
        { text: `${w * h} ÷ ${w} = ?`, answer: h },
      ],
    });
  }

  // Same perimeter, different area — the point the book makes with tiles.
  for (const [[w1, h1], [w2, h2]] of [[[6, 4], [8, 2]], [[5, 5], [7, 3]], [[9, 3], [6, 6]], [[10, 2], [7, 5]]] as Array<[[number, number], [number, number]]>) {
    const a1 = w1 * h1, a2 = w2 * h2;
    const bigger = a1 > a2 ? `${w1} על ${h1}` : `${w2} על ${h2}`;
    const smaller = a1 > a2 ? `${w2} על ${h2}` : `${w1} על ${h1}`;
    yield buildItem({
      itemId: `G_AR_SAMEP_${w1}_${h1}_${w2}_${h2}`, skillCode: AR,
      question: `לשני המלבנים אותו היקף. לאיזה מהם שטח גדול יותר: ${w1} על ${h1} או ${w2} על ${h2}?`,
      correct: bigger, signature: smaller, signatureCode: null,
      distractors: ['לשניהם אותו שטח'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `שטח ראשון: ${w1} × ${h1} = ${a1}.` },
        { text: `שטח שני: ${w2} × ${h2} = ${a2}.` },
        { text: 'אותו היקף לא אומר אותו שטח — ככל שהמלבן דומה יותר לריבוע, שטחו גדול יותר.' },
      ],
    });
  }
}

// ─── GEOM_SYMMETRY ───────────────────────────────────────────────────────────

const SY = 'GEOM_SYMMETRY';

function* symmetry(): Generator<PracticeItem> {
  const axes: Array<[string, number]> = [
    ['ריבוע', 4], ['מלבן', 2], ['משולש שווה-צלעות', 3], ['משולש שווה-שוקיים', 1],
    ['מקבילית', 0], ['משושה משוכלל', 6], ['מחומש משוכלל', 5], ['טרפז שווה-שוקיים', 1],
    ['משולש שונה-צלעות', 0], ['מעוין', 2],
  ];
  for (const [name, n] of axes) {
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

  // Rotational symmetry — how many times a full turn brings it back to itself.
  const order: Array<[string, number]> = [
    ['ריבוע', 4], ['מלבן', 2], ['משולש שווה-צלעות', 3], ['משושה משוכלל', 6], ['מחומש משוכלל', 5],
  ];
  for (const [name, n] of order) {
    yield buildItem({
      itemId: `G_SY_ROT_${name}`, skillCode: SY,
      question: `בסיבוב שלם, כמה פעמים ${name} נראה בדיוק כמו בהתחלה?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'מסובבים את הצורה סיבוב שלם וסופרים כמה פעמים היא מתאימה לעצמה.' },
        { text: `ב${name}: ${n} פעמים.`, answer: n },
      ],
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

  for (const [l, w, h] of [[4, 3, 2], [5, 2, 3], [6, 4, 2], [3, 3, 3], [10, 2, 2], [5, 4, 3], [7, 2, 4], [8, 3, 2], [6, 5, 2], [9, 2, 3]]) {
    const v = l * w * h;
    yield buildItem({
      itemId: `G_SO_VOL_${l}_${w}_${h}`, skillCode: SO,
      question: `תיבה שאורכה ${l} ס"מ, רוחבה ${w} ס"מ וגובהה ${h} ס"מ. מה הנפח שלה בסמ"ק?`,
      correct: v,
      signature: l + w + h,                 // added the three edges
      signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'בשכבה התחתונה יש אורך × רוחב קוביות.' },
        { text: `${l} × ${w} = ?`, answer: l * w },
        { text: `ויש ${h} שכבות כאלה: ${l * w} × ${h} = ?`, answer: v },
      ],
    });
  }

  // Layers — the idea volume is built on.
  for (const [l, w, h] of [[4, 3, 2], [5, 2, 3], [6, 4, 2], [5, 4, 3]]) {
    yield buildItem({
      itemId: `G_SO_LAYER_${l}_${w}_${h}`, skillCode: SO,
      question: `בונים תיבה ${l} על ${w} על ${h} מקוביות יחידה. כמה קוביות יש בשכבה אחת?`,
      correct: l * w, signature: l * w * h, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'שכבה אחת היא מלבן של אורך על רוחב.' }, { text: `${l} × ${w} = ?`, answer: l * w }],
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
