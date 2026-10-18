/**
 * Geometry booklet (ה.ש.ב.ח.ה ד' "גאומטריה") — the topics that had no practice
 * until 2026-10-18, one generator per topic, in book order:
 *
 *    5  MEAS_LENGTH_MM        מידות אורך: מ"מ, ס"מ, מטר
 *    7  GEOM_PERIMETER_RECT   היקף מלבן (and the square)
 *    8  GEOM_AREA_GRID        שטח מצולע בסמ"ר — counting squares and half squares
 *   10  GEOM_AREA_M2          שטח במטר רבוע
 *   11  GEOM_PERIM_AREA       עוד על היקף ועל שטח של מלבן
 *   13  GEOM_SYMMETRY_ROT     סימטרייה סיבובית
 *   15  GEOM_SURFACE_AREA     שטח פנים של תיבה
 *   16  GEOM_BOX_DIAGONALS    אלכסונים בתיבה
 *   17  GEOM_VOLUME_CUBES     נפח בקוביות
 *   18  GEOM_VOLUME           נפח תיבה בסמ"ק
 *   19  GEOM_VOLUME_UNITS     יחידות נפח: סמ"ק, ליטר (דצמ"ק), מ"ק
 *   20  GEOM_SURFACE_VOLUME   עוד על שטח פנים ועל נפח
 *   21  GEOM_WEIGHT_VOLUME    הקשר בין משקל לנפח (מים)
 *   22  MEAS_CALENDAR         לוח השנה וחישובי זמן
 *
 * Grade-4 limits kept throughout: whole numbers only, no angle measurement in
 * degrees (turns are named as fractions of a turn, as the class names them),
 * and nothing that needs division with a remainder.
 *
 * Perimeter/area confusion carries ERR_PERIM_AREA_SWAP only where the two
 * numbers differ and the wrong one can be typed on the pad.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { regularPolygon, rotateAndFit } from './geometry';
import { type Cell, bbox, perimeterOf, normalize } from './gridUtils';

type Pt = [number, number];

const fmt = (n: number) => n.toLocaleString('en-US');
const LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו'];
const rect = (w: number, h: number): Pt[] => [[0, 0], [w, 0], [w, h], [0, h]];
/** A rectangle drawn to proportion on the 0–100 canvas. */
const rectVisual = (w: number, h: number) => ({
  type: 'polygon' as const,
  points: w >= h ? rect(100, Math.max(12, Math.round((h / w) * 100))) : rect(Math.max(12, Math.round((w / h) * 100)), 100),
  labels: LETTERS.slice(0, 4),
});
const pad = (sig: number, correct: number) => String(sig).length <= String(correct).length + 1;
const swap = (sig: number, correct: number) =>
  sig !== correct && pad(sig, correct)
    ? { signature: sig, signatureCode: 'ERR_PERIM_AREA_SWAP' as const }
    : { signature: null, signatureCode: null };

// ─── 5. MEAS_LENGTH_MM ───────────────────────────────────────────────────────

const LM = 'MEAS_LENGTH_MM';

function* lengthMm(): Generator<PracticeItem> {
  const tip = { text: 'בסנטימטר אחד יש 10 מילימטרים, ובמטר — 100 סנטימטרים, כלומר 1,000 מילימטרים.' };

  // cm → mm. Multiplying by 100 instead of 10 is the unit mix-up.
  for (let k = 1; k <= 60; k++) {
    yield buildItem({
      itemId: `G_LM_CM2MM_${k}`, skillCode: LM,
      question: `כמה מילימטרים יש ב-${k} ס"מ?`,
      correct: k * 10, signature: k * 100, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [tip, { text: `${k} × 10 = ?`, answer: k * 10 }],
    });
  }
  // mm → cm, whole centimetres only.
  for (let n = 20; n <= 900; n += 20) {
    yield buildItem({
      itemId: `G_LM_MM2CM_${n}`, skillCode: LM,
      question: `${n} מ"מ הם כמה סנטימטרים?`,
      correct: n / 10, signature: n % 100 === 0 ? n / 100 : null, signatureCode: n % 100 === 0 ? 'ERR_UNIT_MISMATCH' : null,
      distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [tip, { text: `כל 10 מ"מ הם סנטימטר אחד: ${n} ÷ 10 = ?`, answer: n / 10 }],
    });
  }
  // Mixed units into millimetres: adding the numbers without converting.
  for (let a = 1; a <= 24; a++) {
    for (const b of [2, 5, 8]) {
      yield buildItem({
        itemId: `G_LM_MIX_${a}_${b}`, skillCode: LM,
        question: `סרגל מראה ${a} ס"מ ו-${b} מ"מ. כמה מילימטרים זה בסך הכול?`,
        correct: a * 10 + b, signature: a + b, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `${a} ס"מ הם ${a * 10} מ"מ.`, answer: a * 10 }, { text: `${a * 10} + ${b} = ?`, answer: a * 10 + b }],
      });
    }
  }
  // Metres to centimetres and millimetres.
  for (let m = 1; m <= 9; m++) {
    yield buildItem({
      itemId: `G_LM_M2MM_${m}`, skillCode: LM,
      question: `כמה מילימטרים יש ב-${m} מטר?`,
      correct: m * 1000, signature: m * 100, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `${m} מטר הם ${m * 100} ס"מ.`, answer: m * 100 }, { text: `${m * 100} × 10 = ?`, answer: m * 1000 }],
    });
  }
  // Which is longer — the numbers alone mislead.
  for (let mm = 15; mm <= 95; mm += 5) {
    for (const cm of new Set([Math.floor(mm / 10), Math.floor(mm / 10) + 1])) {
      if (cm < 1) continue;
      const answer = mm > cm * 10 ? `${mm} מ"מ` : mm < cm * 10 ? `${cm} ס"מ` : 'שניהם שווים';
      yield buildItem({
        itemId: `G_LM_CMP_${mm}_${cm}`, skillCode: LM,
        question: `מה ארוך יותר: ${mm} מ"מ או ${cm} ס"מ?`,
        correct: answer, signature: null, signatureCode: null,
        distractors: [`${mm} מ"מ`, `${cm} ס"מ`, 'שניהם שווים'].filter(o => o !== answer), exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [{ text: `ממירים לאותה יחידה: ${cm} ס"מ = ${cm * 10} מ"מ.` }, { text: `משווים ${mm} ל-${cm * 10}.` }],
      });
    }
  }
  // Choosing the unit.
  const objects: Array<[string, string]> = [
    ['עובי של מטבע', 'מ"מ'], ['אורך של נמלה', 'מ"מ'], ['עובי של דף במחברת', 'מ"מ'], ['קוטר של חרוז', 'מ"מ'],
    ['אורך של עיפרון', 'ס"מ'], ['רוחב של ספר', 'ס"מ'], ['אורך של כף יד', 'ס"מ'], ['גובה של כוס', 'ס"מ'],
    ['אורך של כיתה', 'מטר'], ['גובה של עץ', 'מטר'], ['אורך של בריכה', 'מטר'], ['רוחב של רחוב', 'מטר'],
  ];
  for (const [i, [obj, unit]] of objects.entries()) {
    const others = ['מ"מ', 'ס"מ', 'מטר'].filter(u => u !== unit);
    for (const phrasing of [0, 1]) {
      yield buildItem({
        itemId: `G_LM_UNIT_${i}_${phrasing}`, skillCode: LM,
        question: phrasing === 0 ? `באיזו יחידה הכי נוח למדוד ${obj}?` : `מודדים ${obj}. איזו יחידת מידה מתאימה?`,
        correct: unit, signature: null, signatureCode: null, distractors: others, exactOptions: true,
        cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
        steps: [{ text: 'דברים זעירים במ"מ, דברים בגודל של יד בס"מ, ודברים בגודל של חדר במטרים.' }],
      });
    }
  }
}

// ─── 7. GEOM_PERIMETER_RECT ──────────────────────────────────────────────────

const PR = 'GEOM_PERIMETER_RECT';

function* perimeterRect(): Generator<PracticeItem> {
  for (let w = 4; w <= 40; w += 2) {
    for (let h = 3; h < w; h += 3) {
      const p = 2 * (w + h);
      yield buildItem({
        itemId: `G_PR_RECT_${w}_${h}`, skillCode: PR,
        question: `מלבן שאורכו ${w} ס"מ ורוחבו ${h} ס"מ. מה ההיקף שלו בס"מ?`,
        correct: p, ...swap(w * h, p), distractors: [],
        visual: rectVisual(w, h), cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'היקף = כמה דרך עוברים מסביב לצורה — מחברים את כל הצלעות.' },
          { text: `במלבן שתי צלעות באורך ${w} ושתיים באורך ${h}: ${w} + ${h} = ?`, answer: w + h },
          { text: `וכפול 2: ${w + h} × 2 = ?`, answer: p },
        ],
      });
      // Backwards: forgetting that the perimeter counts each side twice.
      yield buildItem({
        itemId: `G_PR_BACK_${w}_${h}`, skillCode: PR,
        question: `היקף מלבן הוא ${p} ס"מ, ואורכו ${w} ס"מ. מה רוחבו בס"מ?`,
        correct: h, signature: p - w, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `קודם מורידים את שני האורכים: ${p} − ${2 * w} = ?`, answer: 2 * h },
          { text: `מה שנשאר הוא שני רוחבים: ${2 * h} ÷ 2 = ?`, answer: h },
        ],
      });
    }
  }
  for (let side = 3; side <= 30; side++) {
    const p = 4 * side;
    yield buildItem({
      itemId: `G_PR_SQ_${side}`, skillCode: PR,
      question: `ריבוע שאורך צלעו ${side} ס"מ. מה ההיקף שלו בס"מ?`,
      correct: p, ...swap(side * side, p), distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'בריבוע כל ארבע הצלעות שוות.' }, { text: `${side} × 4 = ?`, answer: p }],
    });
    yield buildItem({
      itemId: `G_PR_SQBACK_${side}`, skillCode: PR,
      question: `היקף ריבוע הוא ${p} ס"מ. מה אורך הצלע שלו?`,
      correct: side, signature: p / 2, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'לריבוע ארבע צלעות שוות, אז מחלקים את ההיקף ל-4.' }, { text: `${p} ÷ 4 = ?`, answer: side }],
    });
  }
  // How many different rectangles (whole centimetres) share one perimeter.
  for (let p = 8; p <= 48; p += 2) {
    const half = p / 2, count = Math.floor(half / 2);
    yield buildItem({
      itemId: `G_PR_COUNT_${p}`, skillCode: PR,
      question: `כמה מלבנים שונים, שאורך כל צלע בהם הוא מספר שלם של ס"מ, אפשר לבנות עם היקף של ${p} ס"מ? (ריבוע נחשב מלבן)`,
      correct: count, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `אורך ועוד רוחב הם חצי מההיקף: ${p} ÷ 2 = ?`, answer: half },
        { text: `מחפשים זוגות שסכומם ${half}: 1 ו-${half - 1}, 2 ו-${half - 2}, … עד שהם נפגשים.` },
        { text: 'כמה זוגות יש?', answer: count },
      ],
    });
  }
}

// ─── 8. GEOM_AREA_GRID ───────────────────────────────────────────────────────

const AG = 'GEOM_AREA_GRID';

/** L, T and U shapes built from rectangles, so the outline is always a clean polygon. */
function* gridShapes(): Generator<{ id: string; cells: Cell[] }> {
  const block = (x0: number, y0: number, w: number, h: number): Cell[] => {
    const out: Cell[] = [];
    for (let x = x0; x < x0 + w; x++) for (let y = y0; y < y0 + h; y++) out.push([x, y]);
    return out;
  };
  for (let w = 3; w <= 7; w++) {
    for (let h = 3; h <= 6; h++) {
      for (let cw = 1; cw < w; cw++) {
        for (let ch = 1; ch < h; ch++) {
          if ((w * h + cw * ch) % 3 !== 0) continue;                // thin the sweep evenly
          // L: a rectangle with its top-right corner cut away.
          const cut = new Set(block(w - cw, 0, cw, ch).map(c => c.join(',')));
          yield { id: `L${w}${h}${cw}${ch}`, cells: block(0, 0, w, h).filter(c => !cut.has(c.join(','))) };
        }
      }
      // T: a bar with a stem; U: a bar with two legs.
      if (w % 2 === 1 && h >= 3) yield { id: `T${w}${h}`, cells: normalize([...block(0, 0, w, 1), ...block((w - 1) / 2, 1, 1, h - 1)]) };
      if (w >= 3 && h >= 3) yield { id: `U${w}${h}`, cells: [...block(0, h - 1, w, 1), ...block(0, 0, 1, h - 1), ...block(w - 1, 0, 1, h - 1)] };
    }
  }
}

function* areaGrid(): Generator<PracticeItem> {
  const unitNote = { text: 'כל משבצת היא ריבוע של סנטימטר על סנטימטר — סמ"ר אחד.' };

  for (const { id, cells } of gridShapes()) {
    const a = cells.length, p = perimeterOf(cells);
    const { cols, rows } = bbox(cells);
    yield buildItem({
      itemId: `G_AG_CELLS_${id}`, skillCode: AG,
      question: 'כל משבצת היא סמ"ר אחד. מה שטח הצורה בסמ"ר?',
      correct: a, ...swap(p, a), distractors: [],
      visual: { type: 'grid_shape', cols: cols + 1, rows: rows + 1, cells },
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [unitNote, { text: 'סופרים את המשבצות שבתוך הצורה — לא את הקווים שמסביב.', answer: a }],
    });
  }

  // Right triangles on the grid: half of the rectangle around them.
  for (let a = 2; a <= 8; a++) {
    for (let b = 2; b <= 6; b++) {
      if ((a * b) % 2 !== 0) continue;
      const area = (a * b) / 2;
      yield buildItem({
        itemId: `G_AG_TRI_${a}_${b}`, skillCode: AG,
        question: 'כל משבצת היא סמ"ר אחד. מה שטח המשולש בסמ"ר?',
        correct: area, signature: a * b, signatureCode: null, distractors: [],
        visual: { type: 'grid_shape', cols: a + 1, rows: b + 1, polys: [[[0, 0], [0, b], [a, b]]] },
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `המשולש הוא חצי ממלבן של ${a} על ${b} משבצות.` },
          { text: `שטח המלבן: ${a} × ${b} = ?`, answer: a * b },
          { text: `וחצי ממנו: ${a * b} ÷ 2 = ?`, answer: area },
        ],
      });
    }
  }

  // A rectangle with a half-square triangle on top: count whole squares, then pair the halves.
  for (let w = 2; w <= 7; w++) {
    for (let h = 1; h <= 4; h++) {
      for (let t = 2; t <= w; t += 2) {
        const tri = t / 2, area = w * h + tri;
        yield buildItem({
          itemId: `G_AG_HALF_${w}_${h}_${t}`, skillCode: AG,
          question: 'כל משבצת היא סמ"ר אחד. מה שטח הצורה בסמ"ר? (שני חצאי משבצת הם משבצת שלמה)',
          correct: area, signature: w * h + t, signatureCode: null, distractors: [],
          visual: { type: 'grid_shape', cols: w + 1, rows: h + 2,
                    cells: Array.from({ length: w * h }, (_, i) => [i % w, 1 + Math.floor(i / w)] as Cell),
                    polys: Array.from({ length: t }, (_, i) => i % 2 === 0
                      ? [[i, 1], [i + 1, 0], [i + 1, 1]] as Array<[number, number]>
                      : [[i, 0], [i + 1, 1], [i, 1]] as Array<[number, number]>) },
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `משבצות שלמות: ${w} × ${h} = ?`, answer: w * h },
            { text: `חצאי משבצות: ${t}, ושני חצאים הם משבצת — ${t} ÷ 2 = ?`, answer: tri },
            { text: `${w * h} + ${tri} = ?`, answer: area },
          ],
        });
      }
    }
  }
}

// ─── 10. GEOM_AREA_M2 ────────────────────────────────────────────────────────

const AM = 'GEOM_AREA_M2';

function* areaM2(): Generator<PracticeItem> {
  const places = ['חדר', 'מרפסת', 'גינה', 'מגרש', 'רצפת מטבח'];
  for (let a = 3; a <= 15; a++) {
    for (let b = 2; b <= a; b++) {
      if ((a + b) % 2 === 1 && a > 9) continue;                   // keep the sweep moderate
      const area = a * b, p = 2 * (a + b);
      yield buildItem({
        itemId: `G_AM_ROOM_${a}_${b}`, skillCode: AM,
        question: `${places[(a + b) % places.length]} בצורת מלבן, באורך ${a} מטר וברוחב ${b} מטר. מה השטח במ"ר?`,
        correct: area, ...swap(p, area), distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מטר רבוע (מ"ר) הוא ריבוע שכל צלע בו באורך מטר אחד.' },
          { text: `כמה ריבועים כאלה נכנסים: ${a} × ${b} = ?`, answer: area },
        ],
      });
    }
  }
  // Composite floors: split into two rectangles and add.
  for (let a = 4; a <= 10; a++) {
    for (let b = 2; b <= 5; b++) {
      for (let c = 2; c <= 4; c++) {
        for (const d of [2, 3]) {
          if ((a + b + c + d) % 2 === 1) continue;
          const total = a * b + c * d;
          yield buildItem({
            itemId: `G_AM_L_${a}_${b}_${c}_${d}`, skillCode: AM,
            question: `רצפה מורכבת משני מלבנים: אחד ${a} על ${b} מטר, והשני ${c} על ${d} מטר. מה שטח הרצפה במ"ר?`,
            correct: total, signature: a * b, signatureCode: null, distractors: [],
            cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
            steps: [
              { text: `מלבן ראשון: ${a} × ${b} = ?`, answer: a * b },
              { text: `מלבן שני: ${c} × ${d} = ?`, answer: c * d },
              { text: `${a * b} + ${c * d} = ?`, answer: total },
            ],
          });
        }
      }
    }
  }
  // Which unit fits.
  const things: Array<[string, string]> = [
    ['בול דואר', 'סמ"ר'], ['דף במחברת', 'סמ"ר'], ['כף יד', 'סמ"ר'], ['מסך של טלפון', 'סמ"ר'], ['מטבע', 'סמ"ר'],
    ['רצפת כיתה', 'מ"ר'], ['מגרש כדורסל', 'מ"ר'], ['דירה', 'מ"ר'], ['חצר בית הספר', 'מ"ר'], ['קיר בחדר', 'מ"ר'],
  ];
  for (const [i, [thing, unit]] of things.entries()) {
    for (const ph of [0, 1]) yield buildItem({
      itemId: `G_AM_UNIT_${i}_${ph}`, skillCode: AM,
      question: ph === 0 ? `באיזו יחידה נוח למדוד את השטח של ${thing}?` : `מודדים את השטח של ${thing}. סמ"ר או מ"ר?`,
      correct: unit, signature: null, signatureCode: null,
      distractors: [unit === 'סמ"ר' ? 'מ"ר' : 'סמ"ר'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
      steps: [{ text: 'סמ"ר — לדברים קטנים שאפשר להחזיק ביד. מ"ר — לחדרים, חצרות ומגרשים.' }],
    });
  }
}

// ─── 11. GEOM_PERIM_AREA ─────────────────────────────────────────────────────

const PA = 'GEOM_PERIM_AREA';

function* perimArea(): Generator<PracticeItem> {
  // Same perimeter, different area — the point the book makes with tiles.
  for (let half = 8; half <= 26; half += 2) {
    for (let w1 = Math.ceil(half / 2); w1 < half - 1; w1++) {
      const h1 = half - w1, w2 = w1 + 2, h2 = half - w2;
      if (h2 < 1 || w1 * h1 === w2 * h2) continue;
      const a1 = w1 * h1, a2 = w2 * h2;
      const bigger  = a1 > a2 ? `${w1} על ${h1}` : `${w2} על ${h2}`;
      const smaller = a1 > a2 ? `${w2} על ${h2}` : `${w1} על ${h1}`;
      yield buildItem({
        itemId: `G_PA_SAMEP_${w1}_${h1}_${w2}_${h2}`, skillCode: PA,
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
  // Same area, different perimeter — the mirror image of the above.
  for (const area of [12, 16, 18, 20, 24, 30, 36, 40, 48]) {
    const pairs: Array<[number, number]> = [];
    for (let h = 1; h * h <= area; h++) if (area % h === 0) pairs.push([area / h, h]);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [w1, h1] = pairs[i], [w2, h2] = pairs[j];
        const p1 = 2 * (w1 + h1), p2 = 2 * (w2 + h2);
        const longer = p1 > p2 ? `${w1} על ${h1}` : `${w2} על ${h2}`;
        const shorter = p1 > p2 ? `${w2} על ${h2}` : `${w1} על ${h1}`;
        yield buildItem({
          itemId: `G_PA_SAMEA_${area}_${i}_${j}`, skillCode: PA,
          question: `לשני המלבנים אותו שטח, ${area} סמ"ר. לאיזה מהם היקף גדול יותר: ${w1} על ${h1} או ${w2} על ${h2}?`,
          correct: longer, signature: shorter, signatureCode: null,
          distractors: ['לשניהם אותו היקף'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `היקף ראשון: (${w1} + ${h1}) × 2 = ${p1}.` },
            { text: `היקף שני: (${w2} + ${h2}) × 2 = ${p2}.` },
            { text: 'אותו שטח לא אומר אותו היקף — מלבן ארוך וצר מקיף יותר.' },
          ],
        });
      }
    }
    // How many rectangles with whole sides have this area.
    yield buildItem({
      itemId: `G_PA_COUNT_${area}`, skillCode: PA,
      question: `כמה מלבנים שונים, שאורך הצלעות בהם מספר שלם של ס"מ, יש עם שטח של ${area} סמ"ר? (ריבוע נחשב מלבן)`,
      correct: pairs.length, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `מחפשים זוגות של מספרים שמכפלתם ${area}: ${pairs.map(([w, h]) => `${w} × ${h}`).join(', ')}.` },
              { text: 'כמה זוגות?', answer: pairs.length }],
    });
  }
  // Both perimeter and area are known — find the sides.
  for (let w = 3; w <= 15; w++) {
    for (let h = 2; h < w; h++) {
      if ((w * h) % 2 === 1) continue;
      const p = 2 * (w + h), a = w * h;
      yield buildItem({
        itemId: `G_PA_BOTH_${w}_${h}`, skillCode: PA,
        question: `למלבן היקף של ${p} ס"מ ושטח של ${a} סמ"ר. מה אורך הצלע הארוכה שלו?`,
        correct: w, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `אורך ועוד רוחב: ${p} ÷ 2 = ?`, answer: w + h },
          { text: `מחפשים שני מספרים שסכומם ${w + h} ומכפלתם ${a}.` },
          { text: 'הארוך מביניהם:', answer: w },
        ],
      });
    }
  }
  // Doubling a side.
  for (let w = 3; w <= 12; w++) {
    for (let h = 2; h <= 8; h += 3) {
      yield buildItem({
        itemId: `G_PA_DOUBLE_${w}_${h}`, skillCode: PA,
        question: `מלבן ${w} על ${h} ס"מ. מכפילים את האורך שלו (הרוחב לא משתנה). מה השטח החדש בסמ"ר?`,
        correct: 2 * w * h, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `האורך החדש: ${w} × 2 = ${2 * w}.` }, { text: `${2 * w} × ${h} = ?`, answer: 2 * w * h },
                { text: 'השטח גדל פי 2 — שתי פעמים המלבן המקורי.' }],
      });
    }
  }
}

// ─── 13. GEOM_SYMMETRY_ROT ───────────────────────────────────────────────────

const SR = 'GEOM_SYMMETRY_ROT';

/** Turns named as the class names them: fractions of a whole turn, no degrees. */
const TURN: Record<number, string> = {
  2: 'חצי סיבוב', 3: 'שליש סיבוב', 4: 'רבע סיבוב', 6: 'שישית סיבוב', 8: 'שמינית סיבוב',
};

function* symmetryRot(): Generator<PracticeItem> {
  // Shape, drawing, rotational order (times it fits itself in one full turn).
  const SHAPES: Array<{ name: string; pts: Pt[]; order: number }> = [
    { name: 'ריבוע',              pts: rect(80, 80), order: 4 },
    { name: 'מלבן',               pts: rect(100, 55), order: 2 },
    { name: 'מקבילית',            pts: [[25, 0], [100, 0], [75, 55], [0, 55]], order: 2 },
    { name: 'מעוין',              pts: [[50, 0], [85, 50], [50, 100], [15, 50]], order: 2 },
    { name: 'טרפז שווה-שוקיים',   pts: [[25, 0], [75, 0], [100, 55], [0, 55]], order: 1 },
    { name: 'משולש שווה-שוקיים',  pts: [[50, 0], [85, 90], [15, 90]], order: 1 },
    { name: 'משולש שונה-צלעות',   pts: [[10, 10], [95, 40], [30, 90]], order: 1 },
    { name: 'משולש שווה-צלעות',   pts: regularPolygon(3), order: 3 },
    { name: 'מחומש משוכלל',       pts: regularPolygon(5), order: 5 },
    { name: 'משושה משוכלל',       pts: regularPolygon(6), order: 6 },
    { name: 'מתומן משוכלל',       pts: regularPolygon(8), order: 8 },
    { name: 'מתושע משוכלל',       pts: regularPolygon(9), order: 9 },
    { name: 'מעושר משוכלל',       pts: regularPolygon(10), order: 10 },
    { name: 'מצולע משוכלל בעל 12 צלעות', pts: regularPolygon(12), order: 12 },
  ];

  for (const s of SHAPES) {
    for (const deg of [0, 30]) {
      yield buildItem({
        itemId: `G_SR_ORDER_${s.name}_${deg}`, skillCode: SR,
        question: `הצורה בציור היא ${s.name}. מסובבים אותה סיבוב שלם סביב המרכז. כמה פעמים במהלך הסיבוב היא נראית בדיוק כמו בהתחלה (כולל בסוף הסיבוב)?`,
        correct: s.order, signature: null, signatureCode: null, distractors: [],
        visual: { type: 'polygon', points: rotateAndFit(s.pts, deg) },
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מדמיינים שמסובבים את הצורה לאט, ובודקים מתי היא מכסה בדיוק את עצמה.' },
          { text: s.order === 1 ? 'רק בסוף הסיבוב השלם — אין לה סימטרייה סיבובית.' : `זה קורה ${s.order} פעמים.`, answer: s.order },
        ],
      });
    }
    yield buildItem({
      itemId: `G_SR_HAS_${s.name}`, skillCode: SR,
      question: `האם יש ל${s.name} סימטרייה סיבובית?`,
      correct: s.order > 1 ? 'כן' : 'לא', signature: null, signatureCode: null,
      distractors: [s.order > 1 ? 'לא' : 'כן'], exactOptions: true,
      visual: { type: 'polygon', points: s.pts },
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: 'לצורה יש סימטרייה סיבובית אם היא מכסה את עצמה בסיבוב שקטן מסיבוב שלם.' }],
    });
    // After a given turn, does it look the same?
    for (const [k, turn] of Object.entries(TURN)) {
      const n = Number(k);
      const fits = s.order % n === 0;
      yield buildItem({
        itemId: `G_SR_TURN_${s.name}_${n}`, skillCode: SR,
        question: `הצורה בציור היא ${s.name}. מסובבים אותה ב${turn} סביב המרכז. האם היא נראית בדיוק כמו בהתחלה?`,
        correct: fits ? 'כן' : 'לא', signature: null, signatureCode: null,
        distractors: [fits ? 'לא' : 'כן'], exactOptions: true,
        visual: { type: 'polygon', points: s.pts },
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: s.order > 1
              ? `הצורה מכסה את עצמה בכל ${TURN[s.order] ?? `חלק ה-${s.order} של סיבוב`}.`
              : 'הצורה מכסה את עצמה רק בסיבוב שלם.' },
          { text: fits ? `${turn} הוא בדיוק כמה צעדים כאלה — כן.` : `${turn} לא מגיע לאחד הצעדים האלה — לא.` },
        ],
      });
    }
  }
  // The smallest turn that brings it back, named.
  for (const s of SHAPES.filter(x => TURN[x.order])) {
    const options = Object.values(TURN).filter(t => t !== TURN[s.order]).slice(0, 3);
    yield buildItem({
      itemId: `G_SR_MIN_${s.name}`, skillCode: SR,
      question: `הצורה בציור היא ${s.name}. מה הסיבוב הקטן ביותר שאחריו היא נראית בדיוק כמו בהתחלה?`,
      correct: TURN[s.order], signature: null, signatureCode: null, distractors: options, exactOptions: true,
      visual: { type: 'polygon', points: s.pts },
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [{ text: `בסיבוב שלם הצורה מכסה את עצמה ${s.order} פעמים, אז כל צעד הוא חלק ה-${s.order} של סיבוב: ${TURN[s.order]}.` }],
    });
  }
  // Regular polygons: the rule behind the list — n sides, n positions.
  for (let n = 3; n <= 12; n++) {
    yield buildItem({
      itemId: `G_SR_REG_${n}`, skillCode: SR,
      question: `למצולע משוכלל יש ${n} צלעות. בסיבוב שלם, כמה פעמים הצורה מכסה את עצמה?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      visual: { type: 'polygon', points: regularPolygon(n) },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'במצולע משוכלל כל הצלעות והזוויות שוות, אז כל קודקוד יכול לתפוס את המקום של הראשון.' },
              { text: 'מספר הפעמים שווה למספר הקודקודים:', answer: n }],
    });
  }
}

// ─── Boxes: shared sweep ─────────────────────────────────────────────────────

/** Box dimensions l ≥ w, swept; h free. */
function* boxes(maxL: number, maxW: number, maxH: number, keep: (l: number, w: number, h: number) => boolean) {
  for (let l = 2; l <= maxL; l++) for (let w = 1; w <= Math.min(l, maxW); w++) for (let h = 1; h <= maxH; h++) {
    if (keep(l, w, h)) yield [l, w, h] as const;
  }
}

// ─── 15. GEOM_SURFACE_AREA ───────────────────────────────────────────────────

const SA = 'GEOM_SURFACE_AREA';

function* surfaceArea(): Generator<PracticeItem> {
  for (const [l, w, h] of boxes(12, 8, 9, (l, w, h) => (l + 2 * w + 3 * h) % 4 === 0 && w >= 2)) {
    const three = l * w + l * h + w * h, s = 2 * three;
    yield buildItem({
      itemId: `G_SA_BOX_${l}_${w}_${h}`, skillCode: SA,
      question: `תיבה שאורכה ${l} ס"מ, רוחבה ${w} ס"מ וגובהה ${h} ס"מ. מה שטח הפנים שלה בסמ"ר?`,
      correct: s, signature: three, signatureCode: null, distractors: [],
      visual: { type: 'box', l, w, h, dims: { unit: 'ס"מ' } },
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'שטח פנים = השטח של כל שש הפאות יחד. הפאות באות בזוגות שווים.' },
        { text: `פאה ${l} על ${w}: ${l} × ${w} = ?`, answer: l * w },
        { text: `פאה ${l} על ${h}: ${l} × ${h} = ?`, answer: l * h },
        { text: `פאה ${w} על ${h}: ${w} × ${h} = ?`, answer: w * h },
        { text: `${l * w} + ${l * h} + ${w * h} = ${three}, וכל פאה מופיעה פעמיים: ${three} × 2 = ?`, answer: s },
      ],
    });
  }
  for (let e = 2; e <= 15; e++) {
    yield buildItem({
      itemId: `G_SA_CUBE_${e}`, skillCode: SA,
      question: `קובייה שאורך המקצוע שלה ${e} ס"מ. מה שטח הפנים שלה בסמ"ר?`,
      correct: 6 * e * e, signature: 4 * e * e, signatureCode: null, distractors: [],
      visual: { type: 'box', l: e, w: e, h: e, dims: { unit: 'ס"מ' } },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'לקובייה 6 פאות, וכולן ריבועים שווים.' },
              { text: `פאה אחת: ${e} × ${e} = ?`, answer: e * e },
              { text: `${e * e} × 6 = ?`, answer: 6 * e * e }],
    });
    yield buildItem({
      itemId: `G_SA_CUBEBACK_${e}`, skillCode: SA,
      question: `שטח הפנים של קובייה הוא ${6 * e * e} סמ"ר. מה השטח של פאה אחת שלה?`,
      correct: e * e, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'לקובייה 6 פאות שוות, אז מחלקים ל-6.' }, { text: `${6 * e * e} ÷ 6 = ?`, answer: e * e }],
    });
  }
  // The largest face — reading the drawing.
  for (const [l, w, h] of boxes(10, 7, 6, (l, w, h) => l > w && w > h && (l + w + h) % 2 === 0)) {
    yield buildItem({
      itemId: `G_SA_BIG_${l}_${w}_${h}`, skillCode: SA,
      question: 'מה השטח של הפאה הגדולה ביותר בתיבה, בסמ"ר?',
      correct: l * w, signature: l * h, signatureCode: null, distractors: [],
      visual: { type: 'box', l, w, h, dims: { unit: 'ס"מ' } },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'הפאה הגדולה ביותר בנויה משתי הצלעות הארוכות ביותר.' }, { text: `${l} × ${w} = ?`, answer: l * w }],
    });
  }
}

// ─── 16. GEOM_BOX_DIAGONALS ──────────────────────────────────────────────────
//
// A finite topic: every box has 12 face diagonals and 4 diagonals through the
// box. The questions vary in what she must SEE (how many faces, which vertex,
// which segments), not in the numbers — see the bounded list in poolSize.test.

const BD = 'GEOM_BOX_DIAGONALS';

function* boxDiagonals(): Generator<PracticeItem> {
  const face = { text: 'בכל פאה של תיבה יש 2 אלכסונים — הקווים בין פינות נגדיות של המלבן.' };
  const space = { text: 'אלכסון של תיבה עובר בתוכה, מקודקוד אחד לקודקוד הרחוק ממנו ביותר.' };

  for (let k = 1; k <= 6; k++) {
    yield buildItem({
      itemId: `G_BD_FACES_${k}`, skillCode: BD,
      question: `מציירים את כל האלכסונים ב-${k} פאות של תיבה. כמה אלכסונים מציירים?`,
      correct: 2 * k, signature: k, signatureCode: null, distractors: [],
      visual: { type: 'box', l: 5, w: 3, h: 3, diagonals: 'face' },
      cpaLayer: 'abstract', difficulty: k === 6 ? 2 : 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [face, { text: `${k} × 2 = ?`, answer: 2 * k }],
    });
  }
  const facts: Array<{ id: string; q: string; a: number; steps: Array<{ text: string; answer?: number }>; sig?: number; d?: 'face' | 'space' }> = [
    { id: 'ALLFACE', q: 'כמה אלכסוני פאות יש בתיבה בסך הכול?', a: 12, sig: 6, d: 'face',
      steps: [face, { text: 'לתיבה 6 פאות: 6 × 2 = ?', answer: 12 }] },
    { id: 'SPACE', q: 'כמה אלכסונים עוברים בתוך התיבה (אלכסוני התיבה)?', a: 4, sig: 8, d: 'space',
      steps: [space, { text: 'לכל אלכסון שני קצוות, ולתיבה 8 קודקודים: 8 ÷ 2 = ?', answer: 4 }] },
    { id: 'VERTEXFACE', q: 'כמה אלכסוני פאות יוצאים מקודקוד אחד של תיבה?', a: 3, sig: 2,
      steps: [{ text: 'בכל קודקוד נפגשות 3 פאות, ומכל פאה יוצא מהקודקוד אלכסון אחד.', answer: 3 }] },
    { id: 'VERTEXSPACE', q: 'כמה אלכסוני תיבה יוצאים מקודקוד אחד?', a: 1, sig: 3,
      steps: [space, { text: 'יש רק קודקוד אחד שרחוק ממנו מכולם.', answer: 1 }] },
    { id: 'VERTEXALL', q: 'מקודקוד אחד של תיבה מותחים קו לכל אחד משאר הקודקודים. כמה קווים מותחים?', a: 7, sig: 3,
      steps: [{ text: '3 מקצועות, 3 אלכסוני פאות ואלכסון תיבה אחד.' }, { text: '3 + 3 + 1 = ?', answer: 7 }] },
    { id: 'TOTAL', q: 'כמה אלכסונים יש בתיבה בסך הכול — אלכסוני הפאות ואלכסוני התיבה יחד?', a: 16, sig: 12,
      steps: [{ text: 'אלכסוני פאות: 12. אלכסוני תיבה: 4.' }, { text: '12 + 4 = ?', answer: 16 }] },
    { id: 'NOBASE', q: 'מציירים אלכסונים בכל פאות התיבה חוץ מהבסיס. כמה אלכסונים מציירים?', a: 10, sig: 5,
      steps: [face, { text: 'בלי הבסיס נשארות 5 פאות: 5 × 2 = ?', answer: 10 }] },
    { id: 'SIDES', q: 'מציירים אלכסונים רק בפאות הצדדיות של התיבה (בלי בסיס ובלי מכסה). כמה אלכסונים?', a: 8, sig: 4,
      steps: [face, { text: 'יש 4 פאות צדדיות: 4 × 2 = ?', answer: 8 }] },
    { id: 'EDGESDIAG', q: 'כמה קווים יש בתיבה אם סופרים את כל המקצועות ואת כל אלכסוני הפאות?', a: 24, sig: 18,
      steps: [{ text: 'מקצועות: 12. אלכסוני פאות: 12.' }, { text: '12 + 12 = ?', answer: 24 }] },
    { id: 'CUBE', q: 'כמה אלכסוני פאות יש בקובייה?', a: 12, sig: 6, d: 'face',
      steps: [{ text: 'קובייה היא תיבה — אותן 6 פאות.' }, { text: '6 × 2 = ?', answer: 12 }] },
  ];
  for (const f of facts) {
    yield buildItem({
      itemId: `G_BD_${f.id}`, skillCode: BD, question: f.q,
      correct: f.a, signature: f.sig ?? null, signatureCode: null, distractors: [],
      visual: { type: 'box', l: 5, w: 3, h: 3, diagonals: f.d },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5, steps: f.steps,
    });
  }
  // Equal diagonals: faces of the same size have diagonals of the same length.
  for (const [l, w, h] of [[6, 4, 2], [5, 5, 3], [4, 4, 4], [7, 3, 3], [6, 3, 6]] as const) {
    const dims = [l, w, h];
    // Face kinds the same size as the l×w face; each kind is 2 faces × 2 diagonals.
    // (Dimensions chosen so no two DIFFERENT face sizes happen to share a diagonal length.)
    const kind = (a: number, b: number) => `${Math.max(a, b)}x${Math.min(a, b)}`;
    const equal = [kind(l, w), kind(l, h), kind(w, h)].filter(k => k === kind(l, w)).length * 4;
    yield buildItem({
      itemId: `G_BD_EQUAL_${dims.join('_')}`, skillCode: BD,
      question: `בתיבה ${l} על ${w} על ${h} ס"מ, כמה אלכסוני פאות שווים באורכם לאלכסון של הפאה ${l} על ${w}?`,
      correct: equal, signature: equal === 4 ? 2 : 4, signatureCode: null, distractors: [],
      visual: { type: 'box', l, w, h, dims: { unit: 'ס"מ' }, diagonals: 'face' },
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'לפאות באותו גודל יש אלכסונים באותו אורך.' },
        { text: `כמה פאות בגודל ${l} על ${w} יש? בכל אחת 2 אלכסונים.`, answer: equal },
      ],
    });
  }
}

// ─── 17. GEOM_VOLUME_CUBES ───────────────────────────────────────────────────

const VC = 'GEOM_VOLUME_CUBES';

function* volumeCubes(): Generator<PracticeItem> {
  for (const [l, w, h] of boxes(6, 4, 5, () => true)) {
    if (l * w * h < 4) continue;
    const v = l * w * h;
    yield buildItem({
      itemId: `G_VC_COUNT_${l}_${w}_${h}`, skillCode: VC,
      question: 'התיבה בנויה מקוביות שוות. מכמה קוביות היא בנויה?',
      // Counting only the front face is the classic miss.
      correct: v, signature: l * h !== v ? l * h : null, signatureCode: null, distractors: [],
      visual: { type: 'box', l, w, h, cubes: true },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `בשכבה התחתונה: ${l} קוביות לאורך ו-${w} לרוחב — ${l} × ${w} = ?`, answer: l * w },
        { text: `יש ${h} שכבות כאלה: ${l * w} × ${h} = ?`, answer: v },
      ],
    });
    if (h >= 2) {
      yield buildItem({
        itemId: `G_VC_LAYER_${l}_${w}_${h}`, skillCode: VC,
        question: 'כמה קוביות יש בשכבה אחת של התיבה?',
        correct: l * w, signature: v, signatureCode: null, distractors: [],
        visual: { type: 'box', l, w, h, cubes: true },
        cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'שכבה אחת היא מלבן של אורך על רוחב.' }, { text: `${l} × ${w} = ?`, answer: l * w }],
      });
    }
  }
  // In words, without a picture.
  for (let layers = 2; layers <= 6; layers++) {
    for (let rows = 2; rows <= 5; rows++) {
      for (let per = 3; per <= 8; per += 1) {
        if ((layers + rows + per) % 2 === 0) continue;
        yield buildItem({
          itemId: `G_VC_WORDS_${layers}_${rows}_${per}`, skillCode: VC,
          question: `בונים תיבה מקוביות: ${layers} שכבות, ובכל שכבה ${rows} שורות של ${per} קוביות. כמה קוביות בסך הכול?`,
          correct: layers * rows * per, signature: layers + rows + per, signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: `בשכבה אחת: ${rows} × ${per} = ?`, answer: rows * per },
                  { text: `${rows * per} × ${layers} = ?`, answer: layers * rows * per }],
        });
      }
    }
  }
}

// ─── 18. GEOM_VOLUME ─────────────────────────────────────────────────────────

const VO = 'GEOM_VOLUME';

function* volume(): Generator<PracticeItem> {
  for (const [l, w, h] of boxes(12, 8, 8, (l, w, h) => w >= 2 && h >= 2 && (l + w + h) % 3 === 0)) {
    const v = l * w * h;
    yield buildItem({
      itemId: `G_VO_BOX_${l}_${w}_${h}`, skillCode: VO,
      question: `תיבה שאורכה ${l} ס"מ, רוחבה ${w} ס"מ וגובהה ${h} ס"מ. מה הנפח שלה בסמ"ק?`,
      correct: v, signature: l + w + h, signatureCode: null, distractors: [],
      visual: { type: 'box', l, w, h, dims: { unit: 'ס"מ' } },
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'סמ"ק הוא קובייה של סנטימטר על סנטימטר על סנטימטר.' },
        { text: `בשכבה התחתונה: ${l} × ${w} = ?`, answer: l * w },
        { text: `ויש ${h} שכבות כאלה: ${l * w} × ${h} = ?`, answer: v },
      ],
    });
  }
  // Backwards: volume and base → height.
  for (const [l, w, h] of boxes(10, 6, 9, (l, w, h) => w >= 2 && h >= 2 && (l * w) % 2 === 0 && (l + h) % 2 === 1)) {
    const v = l * w * h;
    yield buildItem({
      itemId: `G_VO_HEIGHT_${l}_${w}_${h}`, skillCode: VO,
      question: `נפח תיבה הוא ${v} סמ"ק. אורכה ${l} ס"מ ורוחבה ${w} ס"מ. מה גובהה בס"מ?`,
      correct: h, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `כמה קוביות בשכבה אחת: ${l} × ${w} = ?`, answer: l * w },
        { text: `כמה שכבות צריך כדי להגיע ל-${v}: ${v} ÷ ${l * w} = ?`, answer: h },
      ],
    });
  }
  for (let e = 2; e <= 10; e++) {
    yield buildItem({
      itemId: `G_VO_CUBE_${e}`, skillCode: VO,
      question: `קובייה שאורך המקצוע שלה ${e} ס"מ. מה הנפח שלה בסמ"ק?`,
      correct: e ** 3, signature: e * e, signatureCode: null, distractors: [],
      visual: { type: 'box', l: e, w: e, h: e, dims: { unit: 'ס"מ' } },
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `שכבה אחת: ${e} × ${e} = ?`, answer: e * e }, { text: `${e * e} × ${e} = ?`, answer: e ** 3 }],
    });
  }
}

// ─── 19. GEOM_VOLUME_UNITS ───────────────────────────────────────────────────

const VU = 'GEOM_VOLUME_UNITS';

function* volumeUnits(): Generator<PracticeItem> {
  const litre = { text: 'ליטר אחד הוא קובייה של 10 ס"מ על 10 ס"מ על 10 ס"מ — 1,000 סמ"ק. זה גם דצמ"ק אחד.' };
  for (let k = 1; k <= 40; k++) {
    yield buildItem({
      itemId: `G_VU_L2CC_${k}`, skillCode: VU,
      question: `כמה סמ"ק יש ב-${k} ליטר?`,
      correct: k * 1000, signature: k * 100, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [litre, { text: `${k} × 1,000 = ?`, answer: k * 1000 }],
    });
    yield buildItem({
      itemId: `G_VU_CC2L_${k}`, skillCode: VU,
      question: `${fmt(k * 1000)} סמ"ק הם כמה ליטרים?`,
      correct: k, signature: k * 10, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [litre, { text: `${fmt(k * 1000)} ÷ 1,000 = ?`, answer: k }],
    });
  }
  for (let k = 1; k <= 20; k++) {
    yield buildItem({
      itemId: `G_VU_M3_${k}`, skillCode: VU,
      question: `מטר מעוקב (מ"ק) הוא 1,000 ליטר. כמה ליטרים יש ב-${k} מ"ק?`,
      correct: k * 1000, signature: k * 100, signatureCode: 'ERR_UNIT_MISMATCH', distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `${k} × 1,000 = ?`, answer: k * 1000 }],
    });
  }
  // Compare across units.
  for (let l = 1; l <= 9; l++) {
    for (const cc of [l * 1000 - 500, l * 1000, l * 1000 + 500, l * 100]) {
      if (cc <= 0) continue;
      const answer = l * 1000 > cc ? `${l} ליטר` : l * 1000 < cc ? `${fmt(cc)} סמ"ק` : 'שניהם שווים';
      yield buildItem({
        itemId: `G_VU_CMP_${l}_${cc}`, skillCode: VU,
        question: `מה יותר: ${l} ליטר או ${fmt(cc)} סמ"ק?`,
        correct: answer, signature: null, signatureCode: null,
        distractors: [`${l} ליטר`, `${fmt(cc)} סמ"ק`, 'שניהם שווים'].filter(o => o !== answer), exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [litre, { text: `${l} ליטר = ${fmt(l * 1000)} סמ"ק. משווים ל-${fmt(cc)}.` }],
      });
    }
  }
  const things: Array<[string, string]> = [
    ['קובייה של משחק', 'סמ"ק'], ['מחק', 'סמ"ק'], ['כפית תרופה', 'סמ"ק'], ['גפרור', 'סמ"ק'],
    ['בקבוק מיץ', 'ליטר'], ['דלי מים', 'ליטר'], ['אקווריום קטן', 'ליטר'], ['סיר מרק', 'ליטר'],
    ['בריכת שחייה', 'מ"ק'], ['חדר שלם', 'מ"ק'], ['מכולה של משאית', 'מ"ק'], ['מאגר מים של עיר', 'מ"ק'],
  ];
  for (const [i, [thing, unit]] of things.entries()) {
    for (const ph of [0, 1]) yield buildItem({
      itemId: `G_VU_UNIT_${i}_${ph}`, skillCode: VU,
      question: ph === 0 ? `באיזו יחידה נוח למדוד את הנפח של ${thing}?` : `מודדים כמה נכנס ב${thing}. איזו יחידה מתאימה?`,
      correct: unit, signature: null, signatureCode: null,
      distractors: ['סמ"ק', 'ליטר', 'מ"ק'].filter(u => u !== unit), exactOptions: true,
      cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
      steps: [{ text: 'סמ"ק לדברים קטנים, ליטר לכלים שממלאים במים, מ"ק לחדרים ולבריכות.' }],
    });
  }
}

// ─── 20. GEOM_SURFACE_VOLUME ─────────────────────────────────────────────────

const SV = 'GEOM_SURFACE_VOLUME';

function* surfaceVolume(): Generator<PracticeItem> {
  const sa = (a: number, b: number, c: number) => 2 * (a * b + a * c + b * c);
  // Same volume, different surface area.
  for (const v of [8, 12, 16, 18, 24, 27, 30, 36]) {
    const triples: Array<[number, number, number]> = [];
    for (let a = 1; a <= v; a++) for (let b = a; a * b <= v; b++) {
      if (v % (a * b) !== 0) continue;
      const c = v / (a * b);
      if (c >= b) triples.push([a, b, c]);
    }
    for (let i = 0; i < triples.length; i++) {
      for (let j = i + 1; j < triples.length; j++) {
        const [s1, s2] = [sa(...triples[i]), sa(...triples[j])];
        if (s1 === s2) continue;
        const name = (t: number[]) => t.join(' על ');
        const more = s1 > s2 ? name(triples[i]) : name(triples[j]);
        const less = s1 > s2 ? name(triples[j]) : name(triples[i]);
        yield buildItem({
          itemId: `G_SV_SAMEV_${v}_${i}_${j}`, skillCode: SV,
          question: `שתי תיבות בנויות כל אחת מ-${v} קוביות של סמ"ק. לאיזו מהן שטח פנים גדול יותר: ${name(triples[i])} או ${name(triples[j])}?`,
          correct: more, signature: less, signatureCode: null, distractors: ['לשתיהן אותו שטח פנים'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `לשתיהן אותו נפח: ${v} סמ"ק.` },
            { text: `שטח פנים ראשון: ${s1} סמ"ר. שני: ${s2} סמ"ר.` },
            { text: 'תיבה ארוכה וצרה עוטפת יותר; תיבה שדומה לקובייה — פחות.' },
          ],
        });
      }
    }
  }
  // Painted cube: n×n×n of unit cubes, painted outside.
  for (let n = 3; n <= 6; n++) {
    const counts: Array<[number, number, string]> = [
      [3, 8, 'אלה הקוביות בפינות — 8 פינות.'],
      [2, 12 * (n - 2), `על כל אחד מ-12 המקצועות, בלי הפינות: 12 × ${n - 2}.`],
      [1, 6 * (n - 2) ** 2, `במרכז כל פאה: 6 × ${n - 2} × ${n - 2}.`],
      [0, (n - 2) ** 3, `בפנים, שלא נוגעות בחוץ: ${n - 2} × ${n - 2} × ${n - 2}.`],
    ];
    for (const [k, c, why] of counts) {
      yield buildItem({
        itemId: `G_SV_PAINT_${n}_${k}`, skillCode: SV,
        question: `בונים קובייה גדולה ${n} על ${n} על ${n} מקוביות קטנות וצובעים את כל הקובייה מבחוץ. בכמה קוביות קטנות צבועות בדיוק ${k === 0 ? 'אפס פאות' : k === 1 ? 'פאה אחת' : `${k} פאות`}?`,
        correct: c, signature: null, signatureCode: null, distractors: [],
        visual: { type: 'box', l: n, w: n, h: n, cubes: true },
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: why, answer: c }],
      });
    }
  }
  // Doubling edges: what happens to the volume.
  const factor = ['פי 2', 'פי 4', 'פי 8'];
  for (const [l, w, h] of boxes(8, 6, 6, (l, w, h) => w >= 2 && h >= 2 && (l * w + h) % 5 === 0)) {
    for (const [k, which] of [[1, 'את האורך'], [2, 'את האורך ואת הרוחב'], [3, 'את כל שלושת המקצועות']] as const) {
      yield buildItem({
        itemId: `G_SV_DOUBLE_${l}_${w}_${h}_${k}`, skillCode: SV,
        question: `תיבה ${l} על ${w} על ${h} ס"מ. מכפילים ${which}. פי כמה גדל הנפח?`,
        correct: factor[k - 1], signature: k > 1 ? `פי ${2 * k}` : null, signatureCode: null,
        distractors: factor.filter(f => f !== factor[k - 1]), exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `נפח לפני: ${l} × ${w} × ${h} = ${l * w * h}.` },
          { text: `כל מקצוע שמכפילים מכפיל את הנפח פי 2 — ${k === 1 ? 'פעם אחת' : k === 2 ? 'פעמיים: 2 × 2' : 'שלוש פעמים: 2 × 2 × 2'}.` },
        ],
      });
    }
  }
}

// ─── 21. GEOM_WEIGHT_VOLUME ──────────────────────────────────────────────────

const WV = 'GEOM_WEIGHT_VOLUME';

function* weightVolume(): Generator<PracticeItem> {
  const water = { text: 'סמ"ק אחד של מים שוקל גרם אחד, ולכן ליטר מים (1,000 סמ"ק) שוקל קילוגרם אחד.' };
  for (let cc = 50; cc <= 950; cc += 50) {
    yield buildItem({
      itemId: `G_WV_CC_${cc}`, skillCode: WV,
      question: `כמה גרם שוקלים ${cc} סמ"ק של מים?`,
      correct: cc, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [water, { text: 'כל סמ"ק — גרם אחד.', answer: cc }],
    });
  }
  for (let k = 1; k <= 30; k++) {
    yield buildItem({
      itemId: `G_WV_L_${k}`, skillCode: WV,
      question: `דלי ובו ${k} ליטר מים. כמה ק"ג שוקלים המים?`,
      correct: k, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [water, { text: 'כל ליטר — קילוגרם אחד.', answer: k }],
    });
  }
  // A full aquarium: volume → litres → kilograms.
  for (let l = 20; l <= 60; l += 10) {
    for (let w = 10; w <= 40; w += 10) {
      for (let h = 10; h <= 50; h += 10) {
        if (w > l) continue;
        const cc = l * w * h, litres = cc / 1000;
        yield buildItem({
          itemId: `G_WV_TANK_${l}_${w}_${h}`, skillCode: WV,
          question: `אקווריום בצורת תיבה, ${l} על ${w} על ${h} ס"מ, מלא מים. כמה ק"ג שוקלים המים?`,
          correct: litres, signature: cc <= 9_999_999 && pad(cc, litres) ? cc : null, signatureCode: null, distractors: [],
          visual: { type: 'box', l: l / 10, w: w / 10, h: h / 10 },
          cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `הנפח: ${l} × ${w} × ${h} = ${fmt(cc)} סמ"ק.` },
            { text: `כמה ליטרים זה: ${fmt(cc)} ÷ 1,000 = ?`, answer: litres },
            { text: 'וכל ליטר מים שוקל קילוגרם.', answer: litres },
          ],
        });
      }
    }
  }
}

// ─── 22. MEAS_CALENDAR ───────────────────────────────────────────────────────

const CA = 'MEAS_CALENDAR';
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];   // a year whose February has 28 days
const WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function* calendar(): Generator<PracticeItem> {
  for (let i = 0; i < 12; i++) {
    yield buildItem({
      itemId: `G_CA_DAYS_${i}`, skillCode: CA,
      question: `כמה ימים יש בחודש ${MONTHS[i]}${i === 1 ? ' (בשנה רגילה)' : ''}?`,
      correct: DAYS_IN[i], signature: null, signatureCode: null,
      distractors: [28, 29, 30, 31].filter(d => d !== DAYS_IN[i]), exactOptions: true,
      cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
      steps: [{ text: 'סופרים על פרקי האצבעות: כל בליטה — 31 ימים, כל שקע — 30 (ופברואר 28 או 29).' }],
    });
  }
  // Weekday after N days — counting the start day is the classic slip.
  for (let start = 0; start < 7; start++) {
    for (let n = 2; n <= 40; n += 3) {
      const ans = WEEKDAYS[(start + n) % 7], slip = WEEKDAYS[(start + n - 1) % 7];
      const others = WEEKDAYS.filter(d => d !== ans && d !== slip);
      yield buildItem({
        itemId: `G_CA_WEEKDAY_${start}_${n}`, skillCode: CA,
        question: `היום יום ${WEEKDAYS[start]}. איזה יום יהיה בעוד ${n} ימים?`,
        correct: ans, signature: slip !== ans ? slip : null, signatureCode: null,
        distractors: [others[(start + n) % others.length], others[(start + n + 2) % others.length]], exactOptions: true,
        cpaLayer: 'abstract', difficulty: n > 7 ? 3 : 2, rng: () => 0.5,
        steps: [
          { text: 'כל 7 ימים חוזרים לאותו יום בשבוע.' },
          { text: `${n} ימים הם ${Math.floor(n / 7)} שבועות שלמים ועוד ${n % 7} ימים, אז סופרים ${n % 7} ימים קדימה מיום ${WEEKDAYS[start]}.` },
        ],
      });
    }
  }
  // Date after N days across a month boundary. Treating every month as 30 days is the signature.
  for (let m = 0; m < 12; m++) {
    for (const d of [18, 24, 27]) {
      for (const n of [6, 9, 12]) {
        const total = d + n;
        if (total <= DAYS_IN[m]) continue;
        const nd = total - DAYS_IN[m], nm = MONTHS[(m + 1) % 12];
        const as30 = total - 30;
        const say = (day: number, month: string) => `${day} ב${month}`;
        yield buildItem({
          itemId: `G_CA_DATE_${m}_${d}_${n}`, skillCode: CA,
          question: `היום ${say(d, MONTHS[m])}. איזה תאריך יהיה בעוד ${n} ימים?`,
          correct: say(nd, nm),
          signature: as30 > 0 && as30 !== nd ? say(as30, nm) : null, signatureCode: null,
          distractors: [say(nd + 1, nm), nd > 1 ? say(nd - 1, nm) : say(nd + 2, nm)], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `בחודש ${MONTHS[m]} יש ${DAYS_IN[m]} ימים.` },
            { text: `עד סוף ${MONTHS[m]} נשארו ${DAYS_IN[m] - d} ימים, ועוד ${n - (DAYS_IN[m] - d)} ימים ב${nm}.` },
          ],
        });
      }
    }
  }
  // How many days from one date to another in the same month: counting both ends is the slip.
  for (let m = 0; m < 12; m += 2) {
    for (let a = 2; a <= 20; a += 3) {
      for (const span of [5, 9, 13]) {
        const b = a + span;
        if (b > DAYS_IN[m]) continue;
        yield buildItem({
          itemId: `G_CA_SPAN_${m}_${a}_${span}`, skillCode: CA,
          question: `מ-${a} ב${MONTHS[m]} עד ${b} ב${MONTHS[m]} — כמה ימים עוברים?`,
          correct: span, signature: span + 1, signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: 'מחסרים את התאריכים: כמה צעדים מהיום הראשון עד האחרון.' }, { text: `${b} − ${a} = ?`, answer: span }],
        });
      }
    }
  }
  // Units of time.
  for (let k = 2; k <= 20; k++) {
    yield buildItem({
      itemId: `G_CA_WEEKS_${k}`, skillCode: CA, question: `כמה ימים יש ב-${k} שבועות?`,
      correct: 7 * k, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `בכל שבוע 7 ימים: ${k} × 7 = ?`, answer: 7 * k }],
    });
    if (k <= 12) {
      yield buildItem({
        itemId: `G_CA_HOURS_${k}`, skillCode: CA, question: `כמה דקות יש ב-${k} שעות?`,
        correct: 60 * k, signature: 100 * k, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `בשעה 60 דקות (לא 100!): ${k} × 60 = ?`, answer: 60 * k }],
      });
      yield buildItem({
        itemId: `G_CA_MONTHS_${k}`, skillCode: CA, question: `כמה חודשים יש ב-${k} שנים?`,
        correct: 12 * k, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `בשנה 12 חודשים: ${k} × 12 = ?`, answer: 12 * k }],
      });
    }
    if (k <= 7) {
      yield buildItem({
        itemId: `G_CA_DAYHOURS_${k}`, skillCode: CA, question: `כמה שעות יש ב-${k} ימים?`,
        correct: 24 * k, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `ביממה 24 שעות: ${k} × 24 = ?`, answer: 24 * k }],
      });
    }
  }
  for (const [q, a] of [['כמה שנים יש בעשור?', 10], ['כמה שנים יש במאה?', 100], ['כמה ימים יש בשנה רגילה?', 365],
                        ['כמה ימים יש בשנה שבה בפברואר 29 ימים?', 366], ['כמה עשורים יש במאה?', 10]] as const) {
    yield buildItem({
      itemId: `G_CA_FACT_${a}_${q.length}`, skillCode: CA, question: q,
      correct: a, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'עשור = 10 שנים, מאה = 100 שנים, שנה = 365 ימים (או 366).', answer: a }],
    });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateLengthMm       = (o: GenerateOpts) => take(lengthMm(), o);
export const generatePerimeterRect  = (o: GenerateOpts) => take(perimeterRect(), o);
export const generateAreaGrid       = (o: GenerateOpts) => take(areaGrid(), o);
export const generateAreaM2         = (o: GenerateOpts) => take(areaM2(), o);
export const generatePerimArea      = (o: GenerateOpts) => take(perimArea(), o);
export const generateSymmetryRot    = (o: GenerateOpts) => take(symmetryRot(), o);
export const generateSurfaceArea    = (o: GenerateOpts) => take(surfaceArea(), o);
export const generateBoxDiagonals   = (o: GenerateOpts) => take(boxDiagonals(), o);
export const generateVolumeCubes    = (o: GenerateOpts) => take(volumeCubes(), o);
export const generateVolume         = (o: GenerateOpts) => take(volume(), o);
export const generateVolumeUnits    = (o: GenerateOpts) => take(volumeUnits(), o);
export const generateSurfaceVolume  = (o: GenerateOpts) => take(surfaceVolume(), o);
export const generateWeightVolume   = (o: GenerateOpts) => take(weightVolume(), o);
export const generateCalendar       = (o: GenerateOpts) => take(calendar(), o);
