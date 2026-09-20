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
function carries(a: number, b: number): boolean {
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

function* addSubLarge(): Generator<PracticeItem> {
  // Swept, not listed: every pair in range that actually exercises the skill.
  // The two predicates above are the whole reason the old version hand-picked
  // numbers — as rules they select far more cases than a person would list.
  for (let a = 3_150; a <= 620_000; a += 24_137) {
    for (let b = 1_420; b <= 330_000; b += 28_311) {
      if (a + b > 999_999 || !carries(a, b)) continue;
      yield buildItem({
        itemId: `G_AL_ADD_${a}_${b}`, skillCode: AL,
        question: `כמה זה ${fmt(a)} + ${fmt(b)}?`,
        correct: a + b, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: a + b >= 100_000 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מחברים מימין לשמאל: אחדות, עשרות, מאות — וכל עשר עוברות הלאה.' },
          { text: `${fmt(a)} + ${fmt(b)} = ?`, answer: a + b },
        ],
      });
    }
  }

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

  // Missing addend — the same fact read the other way round.
  for (let a = 4_500; a <= 540_000; a += 41_137) {
    for (let b = 2_300; b <= 260_000; b += 47_311) {
      if (a + b > 999_999 || !carries(a, b)) continue;
      yield buildItem({
        itemId: `G_AL_MISS_${a}_${b}`, skillCode: AL,
        question: `${fmt(a)} + ? = ${fmt(a + b)}. מה המספר החסר?`,
        correct: b, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כדי למצוא מחובר חסר — מחסרים מהסכום את המחובר הידוע.' },
          { text: `${fmt(a + b)} − ${fmt(a)} = ?`, answer: b },
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
      yield buildItem({
        itemId: `G_LK_INV_${a}_${b}`, skillCode: LK,
        question: `ידוע ש-${fmt(a)} + ${fmt(b)} = ${fmt(a + b)}. כמה זה ${fmt(a + b)} − ${fmt(b)}?`,
        correct: a, signature: a + b, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'חיבור וחיסור הם פעולות הפוכות — אפשר לקרוא את אותו תרגיל לאחור.' },
          { text: 'אם מחברים ואז מחסרים את אותו מספר, חוזרים למספר ההתחלתי.', answer: a },
        ],
      });
    }
  }

  // What happens to the answer when one number moves — the unit's real idea.
  for (const d of [10, 100, 1_000, 10_000]) {
    for (let a = 3_400; a <= 180_000; a += 23_137) {
      for (let b = 2_100; b <= 70_000; b += 31_311) {
        if (a + b > 999_999 || b >= a) continue;
        yield buildItem({
          itemId: `G_LK_ADDUP_${a}_${b}_${d}`, skillCode: LK,
          question: `בתרגיל ${fmt(a)} + ${fmt(b)} הגדילו את המחובר הראשון ב-${fmt(d)}. מה קורה לסכום?`,
          correct: `גדל ב-${fmt(d)}`,
          signature: 'לא משתנה', signatureCode: null,
          distractors: [`קטן ב-${fmt(d)}`, `גדל ב-${fmt(d * 2)}`], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
          steps: [
            { text: 'הסכום הוא כמה יש בסך הכול.' },
            { text: `אם הוספנו ${fmt(d)} לאחד המחוברים, בסך הכול יש ${fmt(d)} יותר.` },
          ],
        });

        yield buildItem({
          itemId: `G_LK_SUBUP_${a}_${b}_${d}`, skillCode: LK,
          question: `בתרגיל ${fmt(a)} − ${fmt(b)} הגדילו את המחסר ב-${fmt(d)}. מה קורה להפרש?`,
          correct: `קטן ב-${fmt(d)}`,
          signature: `גדל ב-${fmt(d)}`, signatureCode: null,
          distractors: ['לא משתנה'], exactOptions: true,
          cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: 'המחסר הוא מה שמורידים.' },
            { text: `אם מורידים ${fmt(d)} יותר — נשאר ${fmt(d)} פחות.` },
          ],
        });
      }
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

function* chance(): Generator<PracticeItem> {
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
    ['בכיתה של 30 תלמידים יש שניים שנולדו באותו חודש', 'אפשרי'],
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

  // Which is likelier — counting, not guessing. Every mix in range.
  for (let red = 1; red <= 12; red++) {
    for (let blue = 1; blue <= 12; blue++) {
      const same   = red === blue;
      const answer = same ? 'סיכוי שווה' : red > blue ? 'אדום' : 'כחול';
      yield buildItem({
        itemId: `G_CH_BOX_${red}_${blue}`, skillCode: CH,
        question: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. איזה צבע יש סיכוי גדול יותר להוציא?`,
        correct: answer,
        signature: same ? null : red > blue ? 'כחול' : 'אדום',
        signatureCode: null,
        distractors: same ? ['אדום', 'כחול'] : ['סיכוי שווה'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: same ? 3 : Math.abs(red - blue) <= 2 ? 2 : 1, rng: () => 0.5,
        steps: [
          { text: 'סופרים מכל צבע — ממה שיש יותר, הסיכוי גדול יותר.' },
          { text: `אדום: ${red}, כחול: ${blue}.` },
        ],
      });

      // How many of the box are red? Chance as a fraction of the whole.
      if ((red + blue) % 2 === 0 && red + blue <= 20) {
        yield buildItem({
          itemId: `G_CH_COUNT_${red}_${blue}`, skillCode: CH,
          question: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. כמה כדורים בקופסה בסך הכול?`,
          correct: red + blue, signature: Math.abs(red - blue), signatureCode: null, distractors: [],
          cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
          steps: [{ text: 'הסיכוי נמדד מתוך כל הכדורים — אז קודם סופרים את כולם.', answer: red + blue }],
        });
      }
    }
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

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateAddSubLarge = (o: GenerateOpts) => take(addSubLarge(), o);
export const generateAddSubLink  = (o: GenerateOpts) => take(addSubLink(), o);
export const generateOrderOps    = (o: GenerateOpts) => take(orderOps(), o);
export const generateWordLarge   = (o: GenerateOpts) => take(wordLarge(), o);
export const generateNegatives   = (o: GenerateOpts) => take(negatives(), o);
export const generateDiagrams    = (o: GenerateOpts) => take(diagrams(), o);
export const generateChance      = (o: GenerateOpts) => take(chance(), o);
export const generateGematria    = (o: GenerateOpts) => take(gematria(), o);
