/**
 * Numbers booklet, units 7–15 (ה.ש.ב.ח.ה ד' "מספרים בתחום המיליון", pp. 73–192).
 *
 *   ARITH_ADD_SUB_LARGE — חיבור וחיסור בתחום המיליון (the existing graph node).
 *   NUM_ADD_SUB_LINK    — הקשר בין חיבור לחיסור, והשפעת שינוי באחד המחוברים.
 *   NUM_ORDER_OPS       — סדר פעולות וסוגריים.
 *   NUM_WORD_LARGE      — בעיות מילוליות במספרים גדולים.
 *   NUM_NEGATIVE        — מספרים שליליים (thermometer and number line).
 *   DATA_DIAGRAMS       — דיאגרמות: reading a bar chart.
 *   DATA_CHANCE         — ניתוח סיכויים: certain / possible / impossible.
 *   NUM_GEMATRIA        — שיטת א"ב העברי וגימטריה.
 *
 * Two things this file is careful about, both learned from live bugs:
 *
 *   Word problems are written from fixed (subject, verb, object) templates. A
 *   generator that mixed nouns and verbs freely produced "children were sold to
 *   a class" and "the class ate books". A template here owns its whole sentence.
 *
 *   Negative numbers are written with the true minus (−), never a hyphen, so
 *   MathText isolates them and "−3" does not reach her as "3−".
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const fmt = (n: number) => n.toLocaleString('en-US');
const neg = (n: number) => (n < 0 ? `−${Math.abs(n)}` : `${n}`);

// ─── ARITH_ADD_SUB_LARGE ─────────────────────────────────────────────────────

const AL = 'ARITH_ADD_SUB_LARGE';

/** True when adding these two carries at least once — otherwise it teaches nothing. */
export function carries(a: number, b: number): boolean {
  let x = a, y = b;
  while (x > 0 || y > 0) {
    if ((x % 10) + (y % 10) >= 10) return true;
    x = Math.floor(x / 10); y = Math.floor(y / 10);
  }
  return false;
}

/** True when the subtraction has to borrow THROUGH a zero — her weak spot. */
function borrowsThroughZero(a: number, b: number): boolean {
  const A = String(a).split('').reverse().map(Number);
  const B = String(b).padStart(String(a).length, '0').split('').reverse().map(Number);
  for (let i = 0; i < A.length; i++) {
    if (A[i] >= B[i]) continue;
    for (let j = i + 1; j < A.length; j++) {     // look left for the zero to break
      if (A[j] === 0) return true;
      if (A[j] > 0) break;
    }
  }
  return false;
}

/**
 * Topic 8, חיסור בתחום ה-1,000,000. The code keeps its old name for the data
 * already stored under it; addition moved to NUM_ADD_LARGE (topic 7) when the
 * books' contents showed they are two separate topics.
 */
function* addSubLarge(): Generator<PracticeItem> {
  for (let a = 10_000; a <= 700_000; a += 17_137) {
    for (let b = 1_250; b < a && b <= 400_000; b += 26_711) {
      if (!borrowsThroughZero(a, b)) continue;
      const wrong = smallerFromLarger(a, b);
      yield buildItem({
        itemId: `G_AL_SUB_${a}_${b}`, skillCode: AL,
        question: `כמה זה ${fmt(a)} − ${fmt(b)}?`,
        correct: a - b,
        // Column-by-column "take the smaller from the larger" — the classic.
        signature: wrong !== a - b && String(wrong).length <= String(a - b).length + 1 ? wrong : null,
        signatureCode: wrong !== a - b && String(wrong).length <= String(a - b).length + 1 ? 'ERR_REGROUP_ZERO' : null,
        distractors: [], cpaLayer: 'abstract',
        difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כשהספרה למעלה קטנה מזו שלמטה — פורטים מהמקום שמשמאל.' },
          { text: 'אפס שפורטים ממנו הופך ל-9, והמקום שאחריו מקבל 10.' },
          { text: `${fmt(a)} − ${fmt(b)} = ?`, answer: a - b },
        ],
      });
    }
  }

  // Estimating a difference — round to thousands first.
  for (let a = 45_300; a <= 960_000; a += 41_117) {
    for (let b = 8_760; b < a && b <= 420_000; b += 47_311) {
      const ra = Math.round(a / 1_000) * 1_000, rb = Math.round(b / 1_000) * 1_000;
      const est = ra - rb;
      if (est <= 10_000) continue;
      yield buildItem({
        itemId: `G_AL_EST_${a}_${b}`, skillCode: AL,
        question: `בערך כמה זה ${fmt(a)} − ${fmt(b)}? (עגלי לאלפים)`,
        correct: fmt(est), signature: fmt(ra + rb), signatureCode: null,
        distractors: [fmt(est + 10_000)], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `${fmt(a)} בערך ${fmt(ra)}, ו-${fmt(b)} בערך ${fmt(rb)}.` },
          { text: `${fmt(ra)} − ${fmt(rb)} = ${fmt(est)}.` },
        ],
      });
    }
  }
}

/** The answer produced by subtracting each column smaller-from-larger. */
function smallerFromLarger(a: number, b: number): number {
  const A = String(a).split('').reverse();
  const B = String(b).split('').reverse();
  const out: string[] = [];
  for (let i = 0; i < A.length; i++) {
    const x = Number(A[i] ?? 0), y = Number(B[i] ?? 0);
    out.push(String(Math.abs(x - y)));
  }
  return Number(out.reverse().join(''));
}

// ─── NUM_ADD_SUB_LINK ────────────────────────────────────────────────────────

const LK = 'NUM_ADD_SUB_LINK';

function* addSubLink(): Generator<PracticeItem> {
  for (let a = 2_500; a <= 240_000; a += 9_137) {
    for (let b = 1_200; b <= 90_000; b += 21_311) {
      if (a + b > 999_999) continue;
      const c = a + b;
      yield buildItem({
        itemId: `G_LK_INV_${a}_${b}`, skillCode: LK,
        question: `ידוע ש-${fmt(a)} + ${fmt(b)} = ${fmt(c)}. כמה זה ${fmt(c)} − ${fmt(b)}?`,
        correct: a, signature: c, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'שלושת המספרים יוצרים משפחה: אם מחברים ואז מחסרים את אותו מספר, חוזרים להתחלה.' },
          { text: 'אז התוצאה היא?', answer: a },
        ],
      });

      // Missing minuend: ? − b = a.
      yield buildItem({
        itemId: `G_LK_MINUEND_${a}_${b}`, skillCode: LK,
        question: `? − ${fmt(b)} = ${fmt(a)}. מהו המחוסר?`,
        correct: c, signature: a - b > 0 ? a - b : null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מחוסר חסר מוצאים בחיבור: ההפרש ועוד המחסר.' },
          { text: `${fmt(a)} + ${fmt(b)} = ?`, answer: c },
        ],
      });

      // Missing subtrahend: c − ? = a.
      yield buildItem({
        itemId: `G_LK_SUBTRAHEND_${a}_${b}`, skillCode: LK,
        question: `${fmt(c)} − ? = ${fmt(a)}. מהו המחסר?`,
        // Adding instead of subtracting — diagnosable only if she can type it
        // (the pad allows one digit more than the answer).
        correct: b, signature: String(c + a).length <= String(b).length + 1 ? c + a : null,
        signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מחסר חסר מוצאים בחיסור: המחוסר פחות ההפרש.' },
          { text: `${fmt(c)} − ${fmt(a)} = ?`, answer: b },
        ],
      });
    }
  }
}

// ─── NUM_ORDER_OPS ───────────────────────────────────────────────────────────

const OP = 'NUM_ORDER_OPS';

function* orderOps(): Generator<PracticeItem> {
  // Swept over whole-number triples where the brackets actually change the
  // answer — if a − (b + c) equals a − b + c the question teaches nothing.
  for (let a = 24; a <= 420; a += 19) {
    for (let b = 6; b < a && b <= 180; b += 23) {
      for (let c = 3; c <= b && c <= 90; c += 13) {
        if (b + c > a) continue;

        if (a - b + c !== a - (b + c)) {
          yield buildItem({
            itemId: `G_OP_SUBPAR_${a}_${b}_${c}`, skillCode: OP,
            question: `כמה זה ${a} − (${b} + ${c})?`,
            correct: a - (b + c),
            signature: a - b + c, signatureCode: 'ERR_ORDER_OPS',
            distractors: [], cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
            steps: [
              { text: 'קודם מה שבתוך הסוגריים.' },
              { text: `${b} + ${c} = ?`, answer: b + c },
              { text: `${a} − ${b + c} = ?`, answer: a - (b + c) },
            ],
          });
        }

        if (c > 0 && a - (b - c) !== a - b - c) {
          yield buildItem({
            itemId: `G_OP_SUBSUB_${a}_${b}_${c}`, skillCode: OP,
            question: `כמה זה ${a} − (${b} − ${c})?`,
            correct: a - (b - c),
            signature: a - b - c >= 0 ? a - b - c : null,
            signatureCode: a - b - c >= 0 ? 'ERR_ORDER_OPS' : null,
            distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
            steps: [
              { text: 'קודם מה שבתוך הסוגריים.' },
              { text: `${b} − ${c} = ?`, answer: b - c },
              { text: `${a} − ${b - c} = ?`, answer: a - (b - c) },
            ],
          });
        }
      }
    }
  }

  // Where do the brackets go to make the sentence true?
  for (let a = 30; a <= 300; a += 23) {
    for (let b = 8; b < a / 2; b += 17) {
      for (let c = 4; c < b; c += 11) {
        if (a - b + c === a - (b + c)) continue;
        yield buildItem({
          itemId: `G_OP_WHERE_${a}_${b}_${c}`, skillCode: OP,
          question: `איזה תרגיל שווה ל-${a - (b + c)}?`,
          correct: `${a} − (${b} + ${c})`,
          signature: `${a} − ${b} + ${c}`, signatureCode: 'ERR_ORDER_OPS',
          distractors: [`(${a} − ${b}) + ${c}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: 'סוגריים אומרים "אותי קודם".' },
            { text: `${b} + ${c} = ${b + c}, ואז ${a} − ${b + c} = ${a - (b + c)}.` },
          ],
        });
      }
    }
  }
}

// ─── NUM_WORD_LARGE ──────────────────────────────────────────────────────────

const WL = 'NUM_WORD_LARGE';

/** Each template owns its full sentence — nouns and verbs are never remixed. */
const WORD_TEMPLATES: Array<{
  id: string;
  ask: (a: number, b: number) => string;
  solve: (a: number, b: number) => number;
  hint: string;
}> = [
  {
    id: 'cities',
    ask: (a, b) => `בעיר אחת גרים ${fmt(a)} תושבים, ובעיר שנייה ${fmt(b)} תושבים. כמה תושבים גרים בשתי הערים יחד?`,
    solve: (a, b) => a + b, hint: 'יחד — מחברים.',
  },
  {
    id: 'factory',
    ask: (a, b) => `במפעל ייצרו ${fmt(a)} בקבוקים ושלחו לחנויות ${fmt(b)}. כמה בקבוקים נשארו במפעל?`,
    solve: (a, b) => a - b, hint: 'שלחו — יוצא החוצה, אז מחסרים.',
  },
  {
    id: 'library',
    ask: (a, b) => `בספרייה יש ${fmt(a)} ספרים. השאילו ${fmt(b)} ספרים. כמה ספרים נשארו על המדפים?`,
    solve: (a, b) => a - b, hint: 'השאילו — יצאו מהמדף, אז מחסרים.',
  },
  {
    id: 'stadium',
    ask: (a, b) => `באצטדיון ${fmt(a)} מקומות ישיבה. הגיעו ${fmt(b)} צופים. כמה מקומות נשארו ריקים?`,
    solve: (a, b) => a - b, hint: 'כמה נשארו ריקים — מחסרים את מי שהגיע.',
  },
  {
    id: 'donation',
    ask: (a, b) => `בשנה שעברה נאספו ${fmt(a)} שקלים, והשנה ${fmt(b)} שקלים יותר. כמה נאספו השנה?`,
    solve: (a, b) => a + b, hint: 'יותר מהשנה שעברה — מחברים.',
  },
  {
    id: 'trip',
    ask: (a, b) => `מטוס טס ${fmt(a)} ק"מ ביום הראשון ו-${fmt(b)} ק"מ ביום השני. כמה ק"מ טס בסך הכול?`,
    solve: (a, b) => a + b, hint: 'בסך הכול — מחברים.',
  },
];

function* wordLarge(): Generator<PracticeItem> {
  // The SENTENCES stay hand-written — freely recombining nouns and verbs is
  // what once produced "children were sold to a class". The NUMBERS sweep.
  for (const t of WORD_TEMPLATES) {
    for (let a = 12_400; a <= 480_000; a += 37_137) {
      for (let b = 3_425; b <= 190_000; b += 43_311) {
        const answer = t.solve(a, b);
        if (answer <= 0 || a + b > 999_999) continue;
        const wrong = answer === a + b ? a - b : a + b;
        yield buildItem({
          itemId: `G_WL_${t.id}_${a}_${b}`, skillCode: WL,
          question: t.ask(a, b),
          correct: answer,
          // Grabbing both numbers and doing the other operation.
          signature: wrong > 0 && wrong !== answer && String(wrong).length <= String(answer).length + 1 ? wrong : null,
          signatureCode: wrong > 0 && wrong !== answer && String(wrong).length <= String(answer).length + 1 ? 'ERR_NUMBER_GRAB' : null,
          distractors: [], cpaLayer: 'abstract',
          difficulty: Math.max(a, b) >= 100_000 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: t.hint },
            { text: `${fmt(a)} ${answer === a + b ? '+' : '−'} ${fmt(b)} = ?`, answer },
          ],
        });
      }
    }
  }
}

// ─── NUM_NEGATIVE ────────────────────────────────────────────────────────────

const NG = 'NUM_NEGATIVE';

function* negatives(): Generator<PracticeItem> {
  // Temperature — the book's model, and the one she meets in life.
  for (let start = 0; start <= 15; start++) {
    for (let drop = start + 1; drop <= start + 20; drop += 3) {
      const end = start - drop;                       // always below zero
      yield buildItem({
        itemId: `G_NG_TEMP_${start}_${drop}`, skillCode: NG,
        question: `הטמפרטורה הייתה ${start}° וירדה ב-${drop} מעלות. מה הטמפרטורה עכשיו?`,
        correct: `${neg(end)}°`,
        signature: `${Math.abs(end)}°`,           // drops the sign
        signatureCode: null,
        distractors: [`${neg(end + 2)}°`, `${start + drop}°`], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        steps: [
          { text: `יורדים ${start} מעלות ומגיעים ל-0.` },
          { text: `נשאר לרדת עוד ${drop - start}, וזה מתחת לאפס: ${neg(end)}°.` },
        ],
      });
    }
  }

  // Order — where "bigger digits" stops meaning "bigger number".
  for (let x = -30; x <= 6; x += 3) {
    for (let y = -28; y <= 8; y += 4) {
      if (x === y || (x >= 0 && y >= 0)) continue;    // at least one negative
      const bigger = Math.max(x, y), smaller = Math.min(x, y);
      yield buildItem({
        itemId: `G_NG_CMP_${x}_${y}`, skillCode: NG,
        question: `איזה מספר גדול יותר: ${neg(x)} או ${neg(y)}?`,
        correct: neg(bigger),
        signature: neg(smaller),                      // picks the bigger digits
        signatureCode: null,
        distractors: ['שווים'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: 'על ישר המספרים, ככל שהולכים ימינה המספר גדול יותר.' },
          { text: `${neg(bigger)} נמצא ימינה יותר, ולכן הוא הגדול.` },
        ],
      });
    }
  }

  // Rising back up — the inverse move.
  for (let start = -22; start <= -1; start += 2) {
    for (let rise = 2; rise <= 26; rise += 4) {
      const end = start + rise;
      yield buildItem({
        itemId: `G_NG_RISE_${start}_${rise}`, skillCode: NG,
        question: `הטמפרטורה הייתה ${neg(start)}° ועלתה ב-${rise} מעלות. מה הטמפרטורה עכשיו?`,
        correct: `${neg(end)}°`,
        signature: `${neg(start - rise)}°`, signatureCode: null,
        distractors: [`${neg(Math.abs(start) + rise)}°`], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `מ-${neg(start)} עולים ${Math.min(rise, Math.abs(start))} מעלות ומגיעים ל-${neg(Math.min(0, start + rise))}.` },
          { text: `בסך הכול: ${neg(end)}°.` },
        ],
      });
    }
  }
}

// ─── DATA_DIAGRAMS ───────────────────────────────────────────────────────────

const DG = 'DATA_DIAGRAMS';

const CHART_THEMES: Array<{ id: string; title: string; unit: string; cats: string[] }> = [
  { id: 'sport', title: 'ספורט אהוב בכיתה',      unit: 'תלמידים', cats: ['כדורגל', 'כדורסל', 'שחייה', 'ריקוד'] },
  { id: 'fruit', title: 'פירות שנמכרו בקיוסק',   unit: 'ק"ג',     cats: ['תפוחים', 'בננות', 'ענבים'] },
  { id: 'books', title: 'ספרים שנקראו בחודש',    unit: 'ספרים',   cats: ['מיה', 'נועה', 'יובל', 'איתי'] },
  { id: 'rain',  title: 'ימי גשם',               unit: 'ימים',    cats: ['נובמבר', 'דצמבר', 'ינואר'] },
  { id: 'pets',  title: 'חיות מחמד בכיתה',       unit: 'תלמידים', cats: ['כלב', 'חתול', 'אוגר', 'דגים'] },
  { id: 'trips', title: 'טיולים בכל עונה',       unit: 'טיולים',  cats: ['סתיו', 'חורף', 'אביב', 'קיץ'] },
];

/** Only one tallest and one shortest bar, or "which is highest" has no answer. */
const readable = (vals: number[]): boolean => {
  const max = Math.max(...vals), min = Math.min(...vals);
  return max !== min
    && vals.filter(v => v === max).length === 1
    && vals.filter(v => v === min).length === 1;
};

function* diagrams(): Generator<PracticeItem> {
  for (const theme of CHART_THEMES) {
    for (let seed = 0; seed < 9; seed++) {
      // Deterministic bar heights: a distinct base per bar, rotated and shifted
      // by the seed. Distinct by construction, so every chart has one clear
      // tallest and one clear shortest bar — the first formula collided and
      // `readable` threw most charts away.
      const base = theme.cats.map((_, i) => 3 + i * 3);
      const vals = theme.cats.map((_, i) => base[(i + seed) % base.length] + (seed % 5));
      if (!readable(vals)) continue;

      const visual = { type: 'bar_chart' as const, title: theme.title, categories: theme.cats, values: vals, unit: theme.unit };
      const maxI = vals.indexOf(Math.max(...vals));
      const minI = vals.indexOf(Math.min(...vals));

      for (let i = 0; i < theme.cats.length; i++) {
        yield buildItem({
          itemId: `G_DG_READ_${theme.id}_${seed}_${i}`, skillCode: DG,
          question: `לפי הדיאגרמה — כמה ${theme.unit} ב${theme.cats[i]}?`,
          correct: vals[i], signature: null, signatureCode: null, distractors: [],
          visual, cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: `מוצאים את העמודה של ${theme.cats[i]} וקוראים את הגובה שלה.`, answer: vals[i] }],
        });
      }

      yield buildItem({
        itemId: `G_DG_MAX_${theme.id}_${seed}`, skillCode: DG,
        question: 'לפי הדיאגרמה — לאיזו קטגוריה העמודה הגבוהה ביותר?',
        correct: theme.cats[maxI], signature: theme.cats[minI], signatureCode: null,
        distractors: theme.cats.filter((_, i) => i !== maxI && i !== minI), exactOptions: true,
        visual, cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
        steps: [{ text: 'משווים את גובה העמודות ובוחרים את הגבוהה ביותר.' }],
      });

      yield buildItem({
        itemId: `G_DG_DIFF_${theme.id}_${seed}`, skillCode: DG,
        question: `לפי הדיאגרמה — בכמה ${theme.unit} יש ב${theme.cats[maxI]} יותר מאשר ב${theme.cats[minI]}?`,
        correct: vals[maxI] - vals[minI],
        signature: vals[maxI] + vals[minI], signatureCode: null, distractors: [],
        visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${theme.cats[maxI]}: ${vals[maxI]}. ${theme.cats[minI]}: ${vals[minI]}.` },
          { text: `${vals[maxI]} − ${vals[minI]} = ?`, answer: vals[maxI] - vals[minI] },
        ],
      });

      const total = vals.reduce((a, b) => a + b, 0);
      yield buildItem({
        itemId: `G_DG_TOTAL_${theme.id}_${seed}`, skillCode: DG,
        question: `לפי הדיאגרמה — כמה ${theme.unit} בסך הכול?`,
        correct: total, signature: Math.max(...vals), signatureCode: null, distractors: [],
        visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: 'מחברים את גובה כל העמודות.', answer: total }],
      });
    }
  }
}

// ─── DATA_CHANCE ─────────────────────────────────────────────────────────────

const CH = 'DATA_CHANCE';

/** Topic 15 — claims about the world stay hand-written. */
function* chanceStatements(): Generator<PracticeItem> {
  const LABELS = ['ודאי', 'אפשרי', 'בלתי אפשרי'];
  // Statements are claims about the world, so they stay written by hand.
  const statements: Array<[string, string]> = [
    ['מטילים קובייה רגילה ומקבלים 7', 'בלתי אפשרי'],
    ['מטילים קובייה רגילה ומקבלים מספר בין 1 ל-6', 'ודאי'],
    ['מטילים קובייה רגילה ומקבלים 4', 'אפשרי'],
    ['מטילים קובייה רגילה ומקבלים מספר זוגי', 'אפשרי'],
    ['מוציאים כדור מקופסה שבה רק כדורים אדומים, ומקבלים כדור אדום', 'ודאי'],
    ['מוציאים כדור מקופסה שבה רק כדורים אדומים, ומקבלים כדור כחול', 'בלתי אפשרי'],
    ['מחר יירד גשם', 'אפשרי'],
    ['מטבע שמטילים ייפול על "עץ"', 'אפשרי'],
    ['בשבוע הבא יהיה יום שני', 'ודאי'],
    // (Not "two of 30 classmates share a birth month" — with 12 months that is
    // CERTAIN, and the September version of this list called it possible.)
    ['מחר יחגוג מישהו בכיתה יום הולדת', 'אפשרי'],
    ['מספר שמוסיפים לו 1 יישאר אותו מספר', 'בלתי אפשרי'],
    ['מוציאים קלף מחפיסה ומקבלים קלף אדום או שחור', 'ודאי'],
  ];
  for (const [text, label] of statements) {
    yield buildItem({
      itemId: `G_CH_CLASS_${statements.findIndex(s => s[0] === text)}`, skillCode: CH,
      question: `${text} — האם זה ודאי, אפשרי או בלתי אפשרי?`,
      correct: label, signature: null, signatureCode: null,
      distractors: LABELS.filter(l => l !== label), exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'ודאי = בטוח יקרה. בלתי אפשרי = לא יכול לקרות. באמצע — אפשרי.' },
        { text: `כאן התשובה היא ${label}.` },
      ],
    });
  }

}

// ─── NUM_GEMATRIA ────────────────────────────────────────────────────────────

const GM = 'NUM_GEMATRIA';

const LETTER_VALUE: Array<[string, number]> = [
  ['א', 1], ['ב', 2], ['ג', 3], ['ד', 4], ['ה', 5], ['ו', 6], ['ז', 7], ['ח', 8], ['ט', 9],
  ['י', 10], ['כ', 20], ['ל', 30], ['מ', 40], ['נ', 50], ['ס', 60], ['ע', 70], ['פ', 80], ['צ', 90],
  ['ק', 100], ['ר', 200], ['ש', 300], ['ת', 400],
];

/** Hebrew numeral for 1–400, with the traditional ט"ו / ט"ז for 15 and 16. */
export function toGematria(n: number): string {
  if (n === 15) return 'ט"ו';
  if (n === 16) return 'ט"ז';
  let rest = n;
  const out: string[] = [];
  for (const [letter, value] of [...LETTER_VALUE].reverse()) {
    while (rest >= value) { out.push(letter); rest -= value; }
  }
  return out.length === 1 ? `${out[0]}'` : `${out.slice(0, -1).join('')}"${out[out.length - 1]}`;
}

function* gematria(): Generator<PracticeItem> {
  for (const [letter, value] of LETTER_VALUE) {
    yield buildItem({
      itemId: `G_GM_VAL_${letter}`, skillCode: GM,
      question: `מה הערך המספרי של האות ${letter}?`,
      correct: value, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: value <= 10 ? 1 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'א–ט הן 1–9, י–צ הן עשרות, ק–ת הן מאות.' },
        { text: `ולכן ${letter} = ?`, answer: value },
      ],
    });
  }

  // toGematria() is a real algorithm, so reading and writing sweep the range.
  for (let n = 11; n <= 400; n += 3) {
    yield buildItem({
      itemId: `G_GM_READ_${n}`, skillCode: GM,
      question: `כמה זה ${toGematria(n)}?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: n >= 100 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'מחברים את הערך של כל אות.' }, { text: 'כמה יוצא?', answer: n }],
    });
  }

  for (let n = 12; n <= 99; n += 7) {
    if (n === 15 || n === 16) continue;
    yield buildItem({
      itemId: `G_GM_WRITE_${n}`, skillCode: GM,
      question: `איך כותבים ${n} בגימטריה?`,
      correct: toGematria(n),
      signature: null, signatureCode: null,
      distractors: [toGematria(n + 1), toGematria(n + 10)], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'קודם את העשרות, ואז את האחדות.' },
        { text: `${n} נכתב ${toGematria(n)}.` },
      ],
    });
  }

  // 15 and 16 — written ט"ו and ט"ז, not י"ה and י"ו.
  for (const n of [15, 16]) {
    const naive = n === 15 ? 'י"ה' : 'י"ו';
    yield buildItem({
      itemId: `G_GM_SPECIAL_${n}`, skillCode: GM,
      question: `איך כותבים ${n} בגימטריה?`,
      correct: toGematria(n),
      signature: naive, signatureCode: null,
      distractors: [toGematria(n === 15 ? 25 : 26)], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `${n} נכתב ${toGematria(n)} ולא ${naive}, כדי לא לכתוב צירוף שהוא שם קדוש.` },
      ],
    });
  }
}


// ─── Enrichments from the plan's skill lists (2026-10-18) ──────────────────

/** Topic 11: only addition → order does not matter; choose a convenient one. */
function* orderOpsSmart(): Generator<PracticeItem> {
  for (const [x, y] of [[250, 750], [480, 520], [1_300, 700], [2_450, 550], [6_100, 3_900], [125, 875], [3_600, 6_400]]) {
    for (let k = 137; k <= 9_999; k += 613) {
      yield buildItem({
        itemId: `G_OP_SMART_${x}_${k}_${y}`, skillCode: OP,
        question: `חשבי בדרך נוחה: ${fmt(x)} + ${fmt(k)} + ${fmt(y)}`,
        correct: x + k + y, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כשיש רק חיבור, אפשר לחבר בכל סדר (חוק החילוף וחוק הקיבוץ).' },
          { text: `קודם ${fmt(x)} + ${fmt(y)} = ?`, answer: x + y },
          { text: `ואז ${fmt(x + y)} + ${fmt(k)} = ?`, answer: x + k + y },
        ],
      });
    }
  }
}

/** Topic 12: word problems that need a weight-unit conversion first. */
const WEIGHT_TEMPLATES: Array<{
  id: string; ask: (a: number, b: number) => string; solve: (a: number, b: number) => number;
  steps: (a: number, b: number) => Array<{ text: string; answer?: number }>;
}> = [
  {
    id: 'kg_g',
    ask: (kg, g) => `בשקית ${kg} ק"ג קמח, ובשקית אחרת ${fmt(g)} גרם. כמה גרם קמח יש בשתי השקיות יחד?`,
    solve: (kg, g) => kg * 1_000 + g,
    steps: (kg, g) => [
      { text: '1 ק"ג = 1,000 גרם. קודם ממירים לאותה יחידה.' },
      { text: `${kg} ק"ג = ? גרם`, answer: kg * 1_000 },
      { text: `${fmt(kg * 1_000)} + ${fmt(g)} = ?`, answer: kg * 1_000 + g },
    ],
  },
  {
    id: 'ton_kg',
    ask: (t, kg) => `משאית העמיסה ${t} טון חול, ופרקה ${fmt(kg)} ק"ג. כמה ק"ג חול נשארו במשאית?`,
    solve: (t, kg) => t * 1_000 - kg,
    steps: (t, kg) => [
      { text: '1 טון = 1,000 ק"ג. קודם ממירים לאותה יחידה.' },
      { text: `${t} טון = ? ק"ג`, answer: t * 1_000 },
      { text: `${fmt(t * 1_000)} − ${fmt(kg)} = ?`, answer: t * 1_000 - kg },
    ],
  },
];

function* wordWeight(): Generator<PracticeItem> {
  for (const t of WEIGHT_TEMPLATES) {
    for (let a = 2; a <= 40; a += 2) {
      for (let b = 150; b <= 990; b += 120) {
        const answer = t.solve(a, b);
        if (answer <= 0) continue;
        const naive = t.id === 'kg_g' ? a + b : a - b;      // no conversion at all
        yield buildItem({
          itemId: `G_WL_${t.id}_${a}_${b}`, skillCode: WL,
          question: t.ask(a, b),
          correct: answer,
          signature: naive > 0 && naive !== answer ? naive : null,
          signatureCode: naive > 0 && naive !== answer ? 'ERR_UNIT_MISMATCH' : null,
          distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: t.steps(a, b),
        });
      }
    }
  }
}

/** Topic 13: opposite numbers sit at the same distance from zero. */
function* negativesMore(): Generator<PracticeItem> {
  for (let n = 1; n <= 60; n++) {
    yield buildItem({
      itemId: `G_NG_OPP_${n}`, skillCode: NG,
      question: `איזה מספר שלילי נמצא באותו מרחק מ-0 כמו ${n}?`,
      correct: neg(-n), signature: String(n), signatureCode: null,
      distractors: [neg(-(n + 1))], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: `${n} נמצא ${n} צעדים מימין ל-0. המספר שנמצא ${n} צעדים משמאל ל-0 הוא ${neg(-n)}.` }],
    });
  }
  for (let depth = 10; depth <= 400; depth += 15) {
    yield buildItem({
      itemId: `G_NG_SEA_${depth}`, skillCode: NG,
      question: `נקודה נמצאת ${depth} מטר מתחת לפני הים. איך כותבים את הגובה שלה?`,
      correct: `${neg(-depth)} מטר`, signature: `${depth} מטר`, signatureCode: null,
      distractors: [`${neg(-(depth + 10))} מטר`], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [{ text: 'פני הים הם 0. מתחת לפני הים — מספר שלילי.' }],
    });
  }
}

/** Topic 15: certain / possible / impossible — generated from a box's contents. */
function* chanceGenerated(): Generator<PracticeItem> {
  const LABELS = ['ודאי', 'אפשרי', 'בלתי אפשרי'];
  for (let red = 0; red <= 9; red++) {
    for (let blue = 0; blue <= 9; blue++) {
      if (red + blue === 0) continue;
      for (const [colour, count] of [['אדום', red], ['כחול', blue], ['ירוק', 0]] as const) {
        const label = count === 0 ? 'בלתי אפשרי' : count === red + blue ? 'ודאי' : 'אפשרי';
        if (colour === 'ירוק' && (red + blue) % 3 !== 0) continue;   // balance the pool
        yield buildItem({
          itemId: `G_CH_GEN_${red}_${blue}_${colour}`, skillCode: CH,
          question: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. מוציאים כדור אחד. שיצא כדור ${colour} — זה ודאי, אפשרי או בלתי אפשרי?`,
          correct: label, signature: null, signatureCode: null,
          distractors: LABELS.filter(l => l !== label), exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: 'אם כל הכדורים בצבע הזה — ודאי. אם אין אף אחד — בלתי אפשרי. אחרת — אפשרי.' },
            { text: `כדורים ${colour === 'אדום' ? 'אדומים' : colour === 'כחול' ? 'כחולים' : 'ירוקים'} בקופסה: ${count}. לכן: ${label}.` },
          ],
        });
      }
    }
  }
}

/** Topic 17: gematria of words, comparing words, and sequences. */
const WORDS = ['אבא', 'אמא', 'גן', 'דג', 'בית', 'ספר', 'שלום', 'חלב', 'לחם', 'ים', 'יד', 'עץ', 'כוכב', 'שמש', 'ירח', 'מים', 'טוב', 'אור', 'חג', 'כיתה'];
const FINAL: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export function wordValue(w: string): number {
  return w.split('').reduce((s, ch) => s + (LETTER_VALUE.find(([l]) => l === (FINAL[ch] ?? ch))?.[1] ?? 0), 0);
}

function* gematriaWords(): Generator<PracticeItem> {
  for (const w of WORDS) {
    const v = wordValue(w);
    yield buildItem({
      itemId: `G_GM_WORD_${w}`, skillCode: GM,
      question: `מה הערך הגימטרי של המילה "${w}"?`,
      correct: v, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `מחברים את ערכי האותיות: ${w.split('').map(ch => `${ch}=${LETTER_VALUE.find(([l]) => l === (FINAL[ch] ?? ch))?.[1]}`).join(', ')}.` },
        { text: 'כמה יוצא?', answer: v },
      ],
    });
  }
  for (let i = 0; i < WORDS.length; i++) {
    for (let j = i + 1; j < WORDS.length; j++) {
      const a = WORDS[i], b = WORDS[j];
      if (wordValue(a) === wordValue(b)) continue;
      const bigger = wordValue(a) > wordValue(b) ? a : b;
      yield buildItem({
        itemId: `G_GM_CMP_${a}_${b}`, skillCode: GM,
        question: `לאיזו מילה ערך גימטרי גדול יותר: "${a}" או "${b}"?`,
        correct: bigger, signature: null, signatureCode: null,
        distractors: [bigger === a ? b : a], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [{ text: `"${a}" = ${wordValue(a)}, ו-"${b}" = ${wordValue(b)}.` }],
      });
    }
  }
}


/** Topic 14: charts whose data are in thousands, and double bar charts. */
const BIG_THEMES: Array<{ id: string; title: string; unit: string; cats: string[]; scale: number }> = [
  { id: 'visitors', title: 'מבקרים בפארק בכל חודש', unit: 'מבקרים', cats: ['מרץ', 'אפריל', 'מאי', 'יוני'], scale: 1_000 },
  { id: 'cars',     title: 'מכוניות שעברו בכביש',   unit: 'מכוניות', cats: ['ראשון', 'שני', 'שלישי'],      scale: 10_000 },
  { id: 'people',   title: 'תושבים בערים',          unit: 'תושבים', cats: ['עיר א', 'עיר ב', 'עיר ג', 'עיר ד'], scale: 100_000 },
];

function* diagramsMore(): Generator<PracticeItem> {
  for (const theme of BIG_THEMES) {
    for (let seed = 0; seed < 8; seed++) {
      const base = theme.cats.map((_, i) => 2 + i * 2);
      const vals = theme.cats.map((_, i) => (base[(i + seed) % base.length] + (seed % 3)) * theme.scale);
      const visual = { type: 'bar_chart' as const, title: theme.title, categories: theme.cats, values: vals, unit: theme.unit };
      const maxI = vals.indexOf(Math.max(...vals)), minI = vals.indexOf(Math.min(...vals));
      for (let i = 0; i < theme.cats.length; i++) {
        yield buildItem({
          itemId: `G_DG_BIG_${theme.id}_${seed}_${i}`, skillCode: DG,
          question: `לפי הדיאגרמה — כמה ${theme.unit} ב${theme.cats[i]}?`,
          correct: vals[i], signature: vals[i] / theme.scale, signatureCode: null, distractors: [],
          visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: `שימי לב לסרגל: הקווים מסומנים באלפים. העמודה של ${theme.cats[i]} מגיעה ל-${fmt(vals[i])}.`, answer: vals[i] }],
        });
      }
      yield buildItem({
        itemId: `G_DG_BIGDIFF_${theme.id}_${seed}`, skillCode: DG,
        question: `לפי הדיאגרמה — בכמה ${theme.unit} יותר ב${theme.cats[maxI]} מאשר ב${theme.cats[minI]}?`,
        correct: vals[maxI] - vals[minI], signature: vals[maxI] + vals[minI] <= 9_999_999 ? vals[maxI] + vals[minI] : null,
        signatureCode: null, distractors: [],
        visual, cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `${fmt(vals[maxI])} − ${fmt(vals[minI])} = ?`, answer: vals[maxI] - vals[minI] }],
      });
    }
  }

  // Double bar chart: two series side by side.
  const DOUBLE: Array<{ id: string; title: string; cats: string[]; legend: [string, string]; unit: string }> = [
    { id: 'reading', title: 'ספרים שנקראו', cats: ['ספטמבר', 'אוקטובר', 'נובמבר'], legend: ['בנים', 'בנות'], unit: 'ספרים' },
    { id: 'sport',   title: 'משתתפים בחוגים', cats: ['כדורגל', 'שחייה', 'ריקוד', 'שחמט'], legend: ['כיתה ד1', 'כיתה ד2'], unit: 'תלמידים' },
  ];
  for (const d of DOUBLE) {
    for (let seed = 0; seed < 10; seed++) {
      const a = d.cats.map((_, i) => 3 + ((i * 3 + seed) % 7));
      const b = d.cats.map((_, i) => 2 + ((i * 5 + seed * 2) % 8));
      const visual = { type: 'bar_chart' as const, title: d.title, categories: d.cats, values: a, values2: b, legend: d.legend, unit: d.unit };
      for (let i = 0; i < d.cats.length; i++) {
        if (a[i] === b[i]) continue;
        const more = a[i] > b[i] ? d.legend[0] : d.legend[1];
        yield buildItem({
          itemId: `G_DG_DBL_${d.id}_${seed}_${i}`, skillCode: DG,
          question: `לפי הדיאגרמה — ב${d.cats[i]}, למי יותר ${d.unit}: ל${d.legend[0]} או ל${d.legend[1]}?`,
          correct: more, signature: more === d.legend[0] ? d.legend[1] : d.legend[0], signatureCode: null,
          distractors: [], exactOptions: true,
          visual, cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [{ text: `בעמודות של ${d.cats[i]}: ${d.legend[0]} ${a[i]}, ${d.legend[1]} ${b[i]}.` }],
        });
        yield buildItem({
          itemId: `G_DG_DBLSUM_${d.id}_${seed}_${i}`, skillCode: DG,
          question: `לפי הדיאגרמה — כמה ${d.unit} בסך הכול ב${d.cats[i]} (בשתי הקבוצות יחד)?`,
          correct: a[i] + b[i], signature: Math.max(a[i], b[i]), signatureCode: null, distractors: [],
          visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: `${a[i]} + ${b[i]} = ?`, answer: a[i] + b[i] }],
        });
      }
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Iterable<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);
function* chain(...gens: Iterable<PracticeItem>[]): Generator<PracticeItem> { for (const g of gens) yield* g; }

export const generateAddSubLarge = (o: GenerateOpts) => take(addSubLarge(), o);
export const generateAddSubLink  = (o: GenerateOpts) => take(addSubLink(), o);
export const generateOrderOps    = (o: GenerateOpts) => take(chain(orderOps(), orderOpsSmart()), o);
export const generateWordLarge   = (o: GenerateOpts) => take(chain(wordLarge(), wordWeight()), o);
export const generateNegatives   = (o: GenerateOpts) => take(chain(negatives(), negativesMore()), o);
export const generateDiagrams    = (o: GenerateOpts) => take(chain(diagrams(), diagramsMore()), o);
export const generateChance      = (o: GenerateOpts) => take(chain(chanceStatements(), chanceGenerated()), o);
export const generateGematria    = (o: GenerateOpts) => take(chain(gematria(), gematriaWords()), o);
