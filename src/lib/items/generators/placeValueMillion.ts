/**
 * PLACE_VALUE_TO_MILLION — המספרים הטבעיים עד מיליון (grade 4).
 *
 * October's classroom topic, and the foundation node beneath multi-digit
 * add/sub, vertical multiplication and long division. Built first for exactly
 * that reason.
 *
 * Curriculum (validated deep research, 3/3 tool agreement, 2026-07-31):
 *   - Range is 0 … 1,000,000 — five- and six-digit numbers, endpoint included.
 *   - Read, write, compare, order, decompose; identify the value of any digit
 *     including internal zeros; place on a number line.
 *   - Decimals are grade 5 and appear nowhere here.
 *
 * Every misconception below is a *verified* signature: the wrong answer is the
 * deterministic output of the documented faulty rule, checked by arithmetic
 * (69/69 signatures verified — see Mia_Math_Grade4_Plan.md §v2.0). The one
 * research signature that failed derivation (99,999+1 → 99,991) is deliberately
 * NOT implemented; the graduated 9+1 / 99+1 / 999+1 probe is used instead.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'PLACE_VALUE_TO_MILLION';

// ─── Hebrew place names ───────────────────────────────────────────────────────

const PLACE_NAMES = [
  { pow: 0, he: 'האחדות' },
  { pow: 1, he: 'העשרות' },
  { pow: 2, he: 'המאות' },
  { pow: 3, he: 'האלפים' },
  { pow: 4, he: 'עשרות האלפים' },
  { pow: 5, he: 'מאות האלפים' },
] as const;

/** Group a numeral with commas, as Israeli textbooks do for large numbers. */
function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function digitAt(n: number, pow: number): number {
  return Math.floor(n / 10 ** pow) % 10;
}

// ─── T1. Value of a digit ─────────────────────────────────────────────────────
//
// "What is the VALUE of the 7 in 472,615?"  → 70,000, not 7.
// Signature ERR_DIGIT_FOR_VALUE: answering the digit itself.

function* enumerateDigitValue(): Generator<PracticeItem> {
  const numbers = [472615, 385291, 405070, 604082, 918473, 250938, 736104, 489517];
  for (const n of numbers) {
    for (const place of [4, 3, 5, 2]) {
      const d = digitAt(n, place);
      if (d === 0) continue;                 // zero-value probes are T3's job
      const correct = d * 10 ** place;
      if (correct === d) continue;           // ones place is not diagnostic
      yield buildItem({
        itemId:        `G_PV_VAL_${n}_${place}`,
        skillCode:     SKILL,
        question:      `מהו הערך של הספרה ${d} במספר ${fmt(n)}?`,
        correct,
        signature:     d,                    // reports the digit, not its value
        signatureCode: 'ERR_DIGIT_FOR_VALUE',
        distractors:   [d * 10 ** (place - 1), d * 10 ** (place + 1)],
        cpaLayer:      'abstract',
        difficulty:    place >= 4 ? 3 : 2,
        answerMode:    'keypad',
        rng:           () => 0.5,
        steps: [
          { text: `באיזה מקום נמצאת הספרה ${d}? זה מקום ${PLACE_NAMES[place].he}.` },
          { text: `כמה שווה יחידה אחת במקום הזה?`, answer: 10 ** place },
          { text: `אז ${d} כאלה שווים:`, answer: correct },
        ],
      });
    }
  }
}

// ─── T2. Compare across different lengths ─────────────────────────────────────
//
// 98,765 vs 102,345 — the child picks 98,765 because 9 > 1.
// Signature ERR_FIRST_DIGIT_CMP.

function* enumerateCompare(): Generator<PracticeItem> {
  const pairs: Array<[number, number]> = [
    [98765, 102345], [87654, 103210], [96432, 105678],
    [89999, 100001], [79852, 100200], [93147, 110925],
  ];
  for (const [small, large] of pairs) {
    yield buildItem({
      itemId:        `G_PV_CMP_${small}_${large}`,
      skillCode:     SKILL,
      question:      `איזה מספר גדול יותר: ${fmt(small)} או ${fmt(large)}?`,
      correct:       large,
      signature:     small,          // chose by leading digit
      signatureCode: 'ERR_FIRST_DIGIT_CMP',
      distractors:   [],
      cpaLayer:      'abstract',
      difficulty:    2,
      rng:           () => 0.5,
      steps: [
        { text: `כמה ספרות יש ב-${fmt(small)}?`,  answer: String(small).length },
        { text: `כמה ספרות יש ב-${fmt(large)}?`, answer: String(large).length },
        { text: 'למספר עם יותר ספרות יש יותר — לא משנה איזו ספרה ראשונה. איזה גדול יותר?', answer: large },
      ],
    });
  }
}

// ─── T3. Write the numeral from Hebrew words (internal zero) ──────────────────
//
// "ארבע מאות וחמישה אלף ושבעים" → 405,070. The child drops the empty places
// and writes 40,570.  Signature ERR_ZERO_PLACEHOLDER.

const WORD_NUMBERS: Array<{ words: string; value: number; dropped: number }> = [
  { words: 'ארבע מאות וחמישה אלף ושבעים',      value: 405070, dropped: 40570 },
  { words: 'שלוש מאות אלף ארבע מאות וחמש',     value: 300405, dropped: 30045 },
  { words: 'שש מאות אלף ושמונים ושתיים',       value: 600082, dropped: 60082 },
  { words: 'מאתיים אלף ושלושים',               value: 200030, dropped: 20030 },
  { words: 'שבע מאות וארבעה אלף ותשע',         value: 704009, dropped: 70409 },
];

function* enumerateWordToNumeral(): Generator<PracticeItem> {
  for (const w of WORD_NUMBERS) {
    yield buildItem({
      itemId:        `G_PV_WORD_${w.value}`,
      skillCode:     SKILL,
      question:      `כתבי בספרות: ${w.words}`,
      correct:       w.value,
      signature:     w.dropped,     // empty places removed instead of zeroed
      signatureCode: 'ERR_ZERO_PLACEHOLDER',
      distractors:   [],
      cpaLayer:      'abstract',
      difficulty:    3,
      answerMode:    'keypad',
      rng:           () => 0.5,
      steps: [
        { text: 'כמה מאות-אלפים?', answer: Math.floor(w.value / 100000) },
        { text: 'כמה אלפים אחרי זה?', answer: Math.floor(w.value / 1000) % 100 },
        { text: 'ומה שנשאר (מאות, עשרות, אחדות)?', answer: w.value % 1000 },
        { text: 'מקום ריק לא נעלם — כותבים בו 0. מה המספר המלא?', answer: w.value },
      ],
    });
  }
}

// ─── T4. Expanded form ────────────────────────────────────────────────────────
//
// 600,000 + 4,000 + 80 + 2 = 604,082. Assembling one column off gives 640,082.
// Signature ERR_PLACE_SHIFT.

function* enumerateExpanded(): Generator<PracticeItem> {
  const specs: Array<[number, number, number, number]> = [
    [6, 4, 8, 2], [3, 7, 5, 1], [8, 2, 6, 4], [5, 9, 3, 7], [2, 6, 4, 9],
  ];
  for (const [hk, k, t, u] of specs) {
    const correct = hk * 100000 + k * 1000 + t * 10 + u;
    const shifted = hk * 100000 + k * 10000 + t * 10 + u;  // thousands one place left
    if (shifted === correct) continue;
    yield buildItem({
      itemId:        `G_PV_EXP_${correct}`,
      skillCode:     SKILL,
      question:      `כמה זה ${fmt(hk * 100000)} + ${fmt(k * 1000)} + ${t * 10} + ${u}?`,
      correct,
      signature:     shifted,
      signatureCode: 'ERR_PLACE_SHIFT',
      distractors:   [],
      cpaLayer:      'abstract',
      difficulty:    3,
      answerMode:    'keypad',
      rng:           () => 0.5,
      steps: [
        { text: `${fmt(k * 1000)} — באיזה מקום יושבת הספרה ${k}? במקום האלפים.` },
        { text: 'נרכיב לפי מקומות: מאות-אלפים, עשרות-אלפים, אלפים, מאות, עשרות, אחדות.' },
        { text: 'מה המספר?', answer: correct },
      ],
    });
  }
}

// ─── T5. Regrouping units ─────────────────────────────────────────────────────
//
// "How many thousands are in 340,000?" → 340, not 34.
// (Research signature; the child reads the leading digits rather than regrouping.)

function* enumerateRegroupUnits(): Generator<PracticeItem> {
  const specs: Array<[number, number]> = [
    [340000, 1000], [520000, 1000], [700000, 1000],
    [460000, 10000], [830000, 10000], [250000, 1000],
  ];
  for (const [n, unit] of specs) {
    const correct = n / unit;
    const leading = Number(String(n).slice(0, 2));  // "reads the first digits"
    if (leading === correct) continue;
    const unitHe = unit === 1000 ? 'אלפים' : 'עשרות-אלפים';
    yield buildItem({
      itemId:        `G_PV_RGP_${n}_${unit}`,
      skillCode:     SKILL,
      question:      `כמה ${unitHe} יש ב-${fmt(n)}?`,
      correct,
      signature:     leading,
      signatureCode: 'ERR_PLACE_SHIFT',
      distractors:   [correct * 10, Math.floor(correct / 10)],
      cpaLayer:      'abstract',
      difficulty:    3,
      answerMode:    'keypad',
      rng:           () => 0.5,
      steps: [
        { text: `${fmt(unit)} אחד — כמה פעמים הוא נכנס ב-${fmt(n)}?` },
        { text: 'אפשר לחלק:', answer: correct },
      ],
    });
  }
}

// ─── T6. Graduated regrouping probe ───────────────────────────────────────────
//
// Replaces the research's 99,999+1 signature, which did not derive cleanly from
// its stated rule. This ladder locates the exact level where her carry chain
// breaks without asserting a fabricated wrong answer.

function* enumerateCarryChain(): Generator<PracticeItem> {
  for (const base of [99, 999, 9999, 99999]) {
    yield buildItem({
      itemId:        `G_PV_CARRY_${base}`,
      skillCode:     SKILL,
      question:      `כמה זה ${fmt(base)} + 1?`,
      correct:       base + 1,
      signature:     null,
      signatureCode: null,
      distractors:   [base, base + 10, Number(String(base).slice(0, -1) + '0')],
      cpaLayer:      'abstract',
      difficulty:    base >= 9999 ? 3 : 1,
      answerMode:    'keypad',
      rng:           () => 0.5,
      steps: [
        { text: 'כשמוסיפים 1 לאחדות ומקבלים 10 — כותבים 0 וממירים הלאה.' },
        { text: 'מה המספר?', answer: base + 1 },
      ],
    });
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = [
    ...enumerateDigitValue(),
    ...enumerateCompare(),
    ...enumerateWordToNumeral(),
    ...enumerateExpanded(),
    ...enumerateRegroupUnits(),
    ...enumerateCarryChain(),
  ];
  return pickFromCombos(combos, opts);
}
