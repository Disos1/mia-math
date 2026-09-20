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

function* addSubLarge(): Generator<PracticeItem> {
  const sums: Array<[number, number]> = [
    [24_500, 13_200], [145_000, 98_500], [7_450, 2_680], [36_900, 45_300],
    [128_400, 71_600], [9_875, 3_425], [250_000, 175_000], [64_300, 28_900],
    [412_000, 88_000], [15_750, 9_260], [303_400, 96_600], [77_800, 22_450],
  ];
  for (const [a, b] of sums) {
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

  // Subtraction, each one crossing a zero — her known weak spot, at scale.
  const diffs: Array<[number, number]> = [
    [50_000, 23_400], [100_000, 47_250], [40_500, 18_700], [200_000, 135_600],
    [70_300, 25_800], [306_000, 148_500], [10_000, 6_250], [90_400, 37_900],
    [500_000, 249_000], [80_050, 46_300], [120_000, 65_400], [604_000, 318_500],
  ];
  for (const [a, b] of diffs) {
    yield buildItem({
      itemId: `G_AL_SUB_${a}_${b}`, skillCode: AL,
      question: `כמה זה ${fmt(a)} − ${fmt(b)}?`,
      correct: a - b,
      // Column-by-column "take the smaller from the larger" — the classic.
      signature: smallerFromLarger(a, b),
      signatureCode: 'ERR_REGROUP_ZERO',
      distractors: [], cpaLayer: 'abstract',
      difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'כשהספרה למעלה קטנה מזו שלמטה — פורטים מהמקום שמשמאל.' },
        { text: 'אפס שפורטים ממנו הופך ל-9, והמקום שאחריו מקבל 10.' },
        { text: `${fmt(a)} − ${fmt(b)} = ?`, answer: a - b },
      ],
    });
  }

  // Missing addend — the same fact read the other way round.
  for (const [a, b] of sums.slice(0, 8)) {
    yield buildItem({
      itemId: `G_AL_MISS_${a}_${b}`, skillCode: AL,
      question: `${fmt(a)} + ? = ${fmt(a + b)}. מה המספר החסר?`,
      correct: b, signature: a + b, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'כדי למצוא מחובר חסר — מחסרים מהסכום את המחובר הידוע.' },
        { text: `${fmt(a + b)} − ${fmt(a)} = ?`, answer: b },
      ],
    });
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
  const facts: Array<[number, number]> = [
    [4_500, 3_200], [12_800, 7_400], [65_000, 24_500], [9_750, 3_250],
    [140_000, 85_000], [7_600, 2_900], [38_400, 11_600], [520_000, 180_000],
  ];
  for (const [a, b] of facts) {
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

  // What happens to the answer when one number moves — the unit's real idea.
  const deltas = [10, 100, 1_000];
  for (const d of deltas) {
    for (const [a, b] of facts.slice(0, 4)) {
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

// ─── NUM_ORDER_OPS ───────────────────────────────────────────────────────────

const OP = 'NUM_ORDER_OPS';

function* orderOps(): Generator<PracticeItem> {
  const cases: Array<[number, number, number]> = [
    [20, 4, 3], [50, 12, 8], [100, 35, 15], [80, 25, 25], [36, 14, 6],
    [200, 60, 40], [75, 30, 15], [48, 18, 12], [90, 45, 25], [150, 70, 30],
  ];
  for (const [a, b, c] of cases) {
    // a − (b + c): left-to-right gives a − b + c, a different number.
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

    // a − (b − c)
    yield buildItem({
      itemId: `G_OP_SUBSUB_${a}_${b}_${c}`, skillCode: OP,
      question: `כמה זה ${a} − (${b} − ${c})?`,
      correct: a - (b - c),
      signature: a - b - c, signatureCode: 'ERR_ORDER_OPS',
      distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'קודם מה שבתוך הסוגריים.' },
        { text: `${b} − ${c} = ?`, answer: b - c },
        { text: `${a} − ${b - c} = ?`, answer: a - (b - c) },
      ],
    });
  }

  // Where do the brackets go to make the sentence true?
  for (const [a, b, c] of cases.slice(0, 6)) {
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
  const pairs: Array<[number, number]> = [
    [145_000, 98_500], [24_500, 13_200], [12_400, 8_750], [306_000, 148_500],
    [64_300, 28_900], [50_000, 23_400], [412_000, 88_000], [9_875, 3_425],
  ];
  for (const t of WORD_TEMPLATES) {
    for (const [a, b] of pairs) {
      const answer = t.solve(a, b);
      if (answer < 0) continue;
      yield buildItem({
        itemId: `G_WL_${t.id}_${a}_${b}`, skillCode: WL,
        question: t.ask(a, b),
        correct: answer,
        // Grabbing both numbers and doing the other operation.
        signature: answer === a + b ? a - b : a + b,
        signatureCode: 'ERR_NUMBER_GRAB',
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

// ─── NUM_NEGATIVE ────────────────────────────────────────────────────────────

const NG = 'NUM_NEGATIVE';

function* negatives(): Generator<PracticeItem> {
  // Temperature — the book's model, and the one she meets in life.
  for (const [start, drop] of [[5, 8], [3, 10], [12, 15], [0, 7], [8, 11], [2, 9], [6, 13], [10, 18]]) {
    const end = start - drop;
    yield buildItem({
      itemId: `G_NG_TEMP_${start}_${drop}`, skillCode: NG,
      question: `הטמפרטורה הייתה ${start}° וירדה ב-${drop} מעלות. מה הטמפרטורה עכשיו?`,
      correct: `${neg(end)}°`,
      signature: `${Math.abs(end)}°`,           // drops the sign
      signatureCode: null,
      distractors: [`${neg(start - drop + 2)}°`, `${start + drop}°`], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: `יורדים ${start} מעלות ומגיעים ל-0.` },
        { text: `נשאר לרדת עוד ${drop - start}, וזה מתחת לאפס: ${neg(end)}°.` },
      ],
    });
  }

  // Order — where "bigger digits" stops meaning "bigger number".
  const pairs: Array<[number, number]> = [
    [-5, -2], [-7, -3], [-1, -9], [-4, 2], [0, -6], [-10, -20], [-15, -8], [3, -3], [-12, -11], [-100, -50],
  ];
  for (const [x, y] of pairs) {
    const bigger = Math.max(x, y);
    yield buildItem({
      itemId: `G_NG_CMP_${x}_${y}`, skillCode: NG,
      question: `איזה מספר גדול יותר: ${neg(x)} או ${neg(y)}?`,
      correct: neg(bigger),
      signature: neg(Math.min(x, y)),          // picks the bigger digits
      signatureCode: null,
      distractors: ['שווים'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'על ישר המספרים, ככל שהולכים ימינה המספר גדול יותר.' },
        { text: `${neg(bigger)} נמצא ימינה יותר, ולכן הוא הגדול.` },
      ],
    });
  }

  // Rising back up — the inverse move.
  for (const [start, rise] of [[-3, 5], [-8, 3], [-10, 10], [-6, 2], [-4, 9], [-15, 7]]) {
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

// ─── DATA_DIAGRAMS ───────────────────────────────────────────────────────────

const DG = 'DATA_DIAGRAMS';

const CHARTS: Array<{ id: string; title: string; unit: string; cats: string[]; vals: number[] }> = [
  { id: 'sport',  title: 'ספורט אהוב בכיתה', unit: 'תלמידים', cats: ['כדורגל', 'כדורסל', 'שחייה', 'ריקוד'], vals: [9, 6, 4, 7] },
  { id: 'fruit',  title: 'פירות שנמכרו בקיוסק', unit: 'ק"ג', cats: ['תפוחים', 'בננות', 'ענבים'], vals: [12, 8, 5] },
  { id: 'books',  title: 'ספרים שנקראו בחודש', unit: 'ספרים', cats: ['מיה', 'נועה', 'יובל', 'איתי'], vals: [5, 8, 3, 6] },
  { id: 'rain',   title: 'ימי גשם', unit: 'ימים', cats: ['נובמבר', 'דצמבר', 'ינואר'], vals: [7, 11, 9] },
];

function* diagrams(): Generator<PracticeItem> {
  for (const c of CHARTS) {
    const visual = { type: 'bar_chart' as const, title: c.title, categories: c.cats, values: c.vals, unit: c.unit };
    for (let i = 0; i < c.cats.length; i++) {
      const cat = c.cats[i];
      yield buildItem({
        itemId: `G_DG_READ_${c.id}_${i}`, skillCode: DG,
        question: `לפי הדיאגרמה — כמה ${c.unit} ב${cat}?`,
        correct: c.vals[i], signature: null, signatureCode: null, distractors: [],
        visual, cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
        steps: [{ text: `מוצאים את העמודה של ${cat} וקוראים את הגובה שלה.`, answer: c.vals[i] }],
      });
    }

    const maxI = c.vals.indexOf(Math.max(...c.vals));
    const minI = c.vals.indexOf(Math.min(...c.vals));
    yield buildItem({
      itemId: `G_DG_MAX_${c.id}`, skillCode: DG,
      question: 'לפי הדיאגרמה — לאיזו קטגוריה העמודה הגבוהה ביותר?',
      correct: c.cats[maxI], signature: c.cats[minI], signatureCode: null,
      distractors: c.cats.filter((_, i) => i !== maxI && i !== minI), exactOptions: true,
      visual, cpaLayer: 'abstract', difficulty: 1, rng: () => 0.5,
      steps: [{ text: 'משווים את גובה העמודות ובוחרים את הגבוהה ביותר.' }],
    });

    yield buildItem({
      itemId: `G_DG_DIFF_${c.id}`, skillCode: DG,
      question: `לפי הדיאגרמה — בכמה ${c.unit} יש ב${c.cats[maxI]} יותר מאשר ב${c.cats[minI]}?`,
      correct: c.vals[maxI] - c.vals[minI],
      signature: c.vals[maxI] + c.vals[minI], signatureCode: null, distractors: [],
      visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `${c.cats[maxI]}: ${c.vals[maxI]}. ${c.cats[minI]}: ${c.vals[minI]}.` },
        { text: `${c.vals[maxI]} − ${c.vals[minI]} = ?`, answer: c.vals[maxI] - c.vals[minI] },
      ],
    });

    const total = c.vals.reduce((s, v) => s + v, 0);
    yield buildItem({
      itemId: `G_DG_TOTAL_${c.id}`, skillCode: DG,
      question: `לפי הדיאגרמה — כמה ${c.unit} בסך הכול?`,
      correct: total, signature: Math.max(...c.vals), signatureCode: null, distractors: [],
      visual, cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'מחברים את גובה כל העמודות.', answer: total }],
    });
  }
}

// ─── DATA_CHANCE ─────────────────────────────────────────────────────────────

const CH = 'DATA_CHANCE';

function* chance(): Generator<PracticeItem> {
  const LABELS = ['ודאי', 'אפשרי', 'בלתי אפשרי'];
  const statements: Array<[string, string]> = [
    ['מטילים קובייה רגילה ומקבלים 7', 'בלתי אפשרי'],
    ['מטילים קובייה רגילה ומקבלים מספר בין 1 ל-6', 'ודאי'],
    ['מטילים קובייה רגילה ומקבלים 4', 'אפשרי'],
    ['מוציאים כדור מקופסה שבה רק כדורים אדומים, ומקבלים כדור אדום', 'ודאי'],
    ['מוציאים כדור מקופסה שבה רק כדורים אדומים, ומקבלים כדור כחול', 'בלתי אפשרי'],
    ['מחר יירד גשם', 'אפשרי'],
    ['מטבע שמטילים ייפול על "עץ"', 'אפשרי'],
    ['בשבוע הבא יהיה יום שני', 'ודאי'],
    ['בכיתה של 30 תלמידים יש שניים שנולדו באותו חודש', 'אפשרי'],
    ['מספר שמוסיפים לו 1 יישאר אותו מספר', 'בלתי אפשרי'],
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

  // Which is likelier — counting, not guessing.
  const boxes: Array<[number, number]> = [[5, 1], [3, 7], [10, 2], [4, 6], [8, 8], [2, 9], [12, 4], [6, 5]];
  for (const [red, blue] of boxes) {
    const same   = red === blue;
    const answer = same ? 'סיכוי שווה' : red > blue ? 'אדום' : 'כחול';
    yield buildItem({
      itemId: `G_CH_BOX_${red}_${blue}`, skillCode: CH,
      question: `בקופסה ${red} כדורים אדומים ו-${blue} כדורים כחולים. איזה צבע יש סיכוי גדול יותר להוציא?`,
      correct: answer,
      signature: same ? null : red > blue ? 'כחול' : 'אדום',
      signatureCode: null,
      distractors: same ? ['אדום', 'כחול'] : ['סיכוי שווה'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: same ? 3 : 1, rng: () => 0.5,
      steps: [
        { text: 'סופרים מכל צבע — ממה שיש יותר, הסיכוי גדול יותר.' },
        { text: `אדום: ${red}, כחול: ${blue}.` },
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

  for (const n of [12, 21, 24, 33, 45, 58, 67, 74, 88, 96, 110, 250, 315, 402]) {
    yield buildItem({
      itemId: `G_GM_READ_${n}`, skillCode: GM,
      question: `כמה זה ${toGematria(n)}?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: n >= 100 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: 'מחברים את הערך של כל אות.' }, { text: 'כמה יוצא?', answer: n }],
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
