/**
 * Multiplication & division booklet (ה.ש.ב.ח.ה ד' "כפל וחילוק", pp. 7–214).
 * January onwards — the hardest stretch of her year.
 *
 *   MULT_BY_TENS        — כפל וחילוק בעשרות, מאות ואלפים שלמים.
 *   MULT_DIV_LINK       — הקשר בין כפל לחילוק, גורם חסר, וסוגריים.
 *   ARITH_MULT_VERTICAL — כפל במאונך (the existing graph node).
 *   DIV_ONE_DIGIT       — חילוק במחלק חד-ספרתי, עם שארית.
 *   ARITH_DIV_LONG      — חילוק ארוך (the existing graph node).
 *   NUM_DIVISIBILITY    — סימני התחלקות ב-2, 3, 5, 6, 9, 10.
 *   NUM_PRIMES          — ראשוניים, פריקים ופירוק לגורמים.
 *
 * Grade-4 constraints from the validated research, kept literally:
 *   • Division: divisor is a single digit or a whole ten. Never an arbitrary
 *     two-digit divisor.
 *   • Remainders are whole numbers written with שארית — never a decimal and
 *     never a fraction, because decimals do not exist in grade 4 at all.
 *
 * Signatures here are deterministic outputs of a named faulty rule: dropping the
 * place-holder zero in the second partial product (ERR_MULT_PLACEHOLDER), and
 * losing a zero when multiplying by whole tens (ERR_ZERO_COUNT).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const fmt = (n: number) => n.toLocaleString('en-US');

// ─── MULT_BY_TENS ────────────────────────────────────────────────────────────

const MT = 'MULT_BY_TENS';

function* multByTens(): Generator<PracticeItem> {
  const units = [3, 4, 6, 7, 8, 9];
  const scales: Array<[number, string]> = [[10, 'עשרות'], [100, 'מאות'], [1_000, 'אלפים']];
  for (const a of units) {
    for (const [scale] of scales) {
      for (const b of [2, 3, 5, 6, 8]) {
        const factor = b * scale;
        yield buildItem({
          itemId: `G_MT_MUL_${a}_${factor}`, skillCode: MT,
          question: `כמה זה ${a} × ${fmt(factor)}?`,
          correct: a * factor,
          signature: a * b * (scale / 10),          // one zero short
          signatureCode: 'ERR_ZERO_COUNT',
          distractors: [], cpaLayer: 'abstract',
          difficulty: scale === 10 ? 1 : scale === 100 ? 2 : 3,
          answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: `קודם כופלים את הספרות: ${a} × ${b} = ?`, answer: a * b },
            { text: `ואז מוסיפים את האפסים של ${fmt(scale)} — ${String(scale).length - 1} אפסים.`, answer: a * factor },
          ],
        });
      }
    }
  }

  // Division the same way — strip the zeros, divide, put them back.
  for (const a of [2, 3, 4, 6, 8]) {
    for (const [scale] of scales) {
      for (const q of [3, 5, 7, 9]) {
        const dividend = a * q * scale, divisor = a * scale;
        if (dividend > 900_000) continue;
        yield buildItem({
          itemId: `G_MT_DIV_${dividend}_${divisor}`, skillCode: MT,
          question: `כמה זה ${fmt(dividend)} ÷ ${fmt(divisor)}?`,
          correct: q,
          signature: q * scale, signatureCode: 'ERR_ZERO_COUNT',
          distractors: [], cpaLayer: 'abstract',
          difficulty: scale === 10 ? 2 : 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'מוחקים את אותו מספר אפסים משני המספרים — התוצאה לא משתנה.' },
            { text: `${a * q} ÷ ${a} = ?`, answer: q },
          ],
        });
      }
    }
  }
}

// ─── MULT_DIV_LINK ───────────────────────────────────────────────────────────

const ML = 'MULT_DIV_LINK';

function* multDivLink(): Generator<PracticeItem> {
  const facts: Array<[number, number]> = [
    [7, 8], [6, 9], [8, 4], [7, 6], [9, 9], [6, 8], [7, 9], [8, 8], [4, 9], [6, 7],
  ];
  for (const [a, b] of facts) {
    yield buildItem({
      itemId: `G_ML_INV_${a}_${b}`, skillCode: ML,
      question: `ידוע ש-${a} × ${b} = ${a * b}. כמה זה ${a * b} ÷ ${b}?`,
      correct: a, signature: a * b, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'כפל וחילוק הם פעולות הפוכות.' },
        { text: `אם ${a} × ${b} = ${a * b}, אז ${a * b} ÷ ${b} מחזיר אותנו ל-${a}.`, answer: a },
      ],
    });

    yield buildItem({
      itemId: `G_ML_MISS_${a}_${b}`, skillCode: ML,
      question: `? × ${b} = ${a * b}. מה הגורם החסר?`,
      correct: a, signature: a * b, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'גורם חסר מוצאים בעזרת חילוק.' },
        { text: `${a * b} ÷ ${b} = ?`, answer: a },
      ],
    });
  }

  // Brackets change the answer — the same lesson as in the numbers booklet.
  const bracketed: Array<[number, number, number]> = [
    [20, 2, 5], [36, 3, 2], [48, 4, 2], [60, 5, 3], [24, 2, 6], [72, 6, 2], [40, 4, 5], [90, 3, 3],
  ];
  for (const [a, b, c] of bracketed) {
    yield buildItem({
      itemId: `G_ML_PAR_${a}_${b}_${c}`, skillCode: ML,
      question: `כמה זה ${a} ÷ (${b} × ${c})?`,
      correct: a / (b * c),
      signature: (a / b) * c, signatureCode: 'ERR_ORDER_OPS',
      distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'קודם מה שבתוך הסוגריים.' },
        { text: `${b} × ${c} = ?`, answer: b * c },
        { text: `${a} ÷ ${b * c} = ?`, answer: a / (b * c) },
      ],
    });
  }
}

// ─── ARITH_MULT_VERTICAL ─────────────────────────────────────────────────────

const MV = 'ARITH_MULT_VERTICAL';

function* multVertical(): Generator<PracticeItem> {
  // Two digits × one digit.
  for (const a of [23, 34, 46, 57, 68, 72, 85, 94, 128, 236]) {
    for (const b of [3, 4, 6, 7, 8]) {
      // Multiplies each digit separately and writes the results side by side.
      // Only claimed for two-digit numbers: on three digits the fake answer runs
      // past what the keypad can hold, and where there is no carry it happens to
      // equal the right answer (23 × 3 → "69"), which would mark her correct
      // answer as a misconception.
      const naive = a < 100 ? digitwise(a, b) : null;
      yield buildItem({
        itemId: `G_MV_ONE_${a}_${b}`, skillCode: MV,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: naive !== null && naive !== a * b ? naive : null,
        signatureCode: naive !== null && naive !== a * b ? 'ERR_MULT_PLACEHOLDER' : null,
        distractors: [], cpaLayer: 'abstract',
        difficulty: a > 99 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כופלים ספרה-ספרה מימין לשמאל, והנשא עובר הלאה.' },
          { text: `${a} × ${b} = ?`, answer: a * b },
        ],
      });
    }
  }

  // Two digits × two digits — where the place-holder zero lives.
  for (const a of [23, 34, 45, 56, 67, 72, 84, 96]) {
    for (const b of [12, 14, 21, 23, 32]) {
      const tens = Math.floor(b / 10), ones = b % 10;
      yield buildItem({
        itemId: `G_MV_TWO_${a}_${b}`, skillCode: MV,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        // The classic: second row written without its place-holder zero.
        signature: a * ones + a * tens !== a * b ? a * ones + a * tens : null,
        signatureCode: a * ones + a * tens !== a * b ? 'ERR_MULT_PLACEHOLDER' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `קודם כופלים באחדות: ${a} × ${ones} = ?`, answer: a * ones },
          { text: `אחר כך בעשרות: ${a} × ${tens} = ${a * tens}, וכותבים אותו מוזז מקום אחד שמאלה — כלומר ${fmt(a * tens * 10)}.` },
          { text: `מחברים: ${fmt(a * ones)} + ${fmt(a * tens * 10)} = ?`, answer: a * b },
        ],
      });
    }
  }
}

/** "34 × 6" done as 3×6 and 4×6 written side by side → 1824. */
function digitwise(a: number, b: number): number {
  const out = String(a).split('').map(d => Number(d) * b).join('');
  return Number(out);
}

// ─── DIV_ONE_DIGIT ───────────────────────────────────────────────────────────

const D1 = 'DIV_ONE_DIGIT';

function* divOneDigit(): Generator<PracticeItem> {
  const cases: Array<[number, number]> = [
    [87, 4], [96, 5], [78, 3], [65, 4], [92, 6], [59, 7], [84, 5], [73, 6],
    [128, 4], [155, 6], [243, 5], [176, 7], [219, 4], [368, 8], [147, 3], [205, 6],
  ];
  for (const [n, d] of cases) {
    const q = Math.floor(n / d), r = n % d;
    yield buildItem({
      itemId: `G_D1_Q_${n}_${d}`, skillCode: D1,
      question: `${n} ÷ ${d} — כמה יוצא (בלי השארית)?`,
      correct: q, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: n > 99 ? 3 : 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `כמה פעמים נכנס ${d} בתוך ${n}?` },
        { text: `${d} × ${q} = ${d * q}, וזה הכי קרוב מתחת ל-${n}.`, answer: q },
      ],
    });

    if (r > 0) {
      yield buildItem({
        itemId: `G_D1_R_${n}_${d}`, skillCode: D1,
        question: `${n} ÷ ${d} — מה השארית?`,
        correct: r,
        signature: d - r, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${d} × ${q} = ${d * q}.` },
          { text: `${n} − ${d * q} = ?`, answer: r },
          { text: `השארית תמיד קטנה מ-${d}.` },
        ],
      });

      yield buildItem({
        itemId: `G_D1_FULL_${n}_${d}`, skillCode: D1,
        question: `כמה זה ${n} ÷ ${d}?`,
        correct: `${q} שארית ${r}`,
        signature: `${q} שארית ${d - r}`, signatureCode: null,
        distractors: [`${q + 1} שארית ${r}`], exactOptions: true,
        cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
        steps: [
          { text: `${d} נכנס ${q} פעמים, ונשאר ${r}.` },
          { text: `כותבים: ${q} שארית ${r}.` },
        ],
      });
    }
  }
}

// ─── ARITH_DIV_LONG ──────────────────────────────────────────────────────────

const DL = 'ARITH_DIV_LONG';

function* divLong(): Generator<PracticeItem> {
  const cases: Array<[number, number]> = [
    [4_536, 4], [1_284, 6], [2_415, 5], [3_672, 8], [5_124, 7], [8_136, 9],
    [1_950, 3], [6_048, 6], [2_744, 4], [7_290, 5], [9_216, 8], [3_504, 6],
  ];
  for (const [n, d] of cases) {
    const q = Math.floor(n / d), r = n % d;
    yield buildItem({
      itemId: `G_DL_${n}_${d}`, skillCode: DL,
      question: r === 0 ? `כמה זה ${fmt(n)} ÷ ${d}?` : `${fmt(n)} ÷ ${d} — כמה יוצא (בלי השארית)?`,
      correct: q, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'בחילוק ארוך מתקדמים ספרה-ספרה משמאל לימין.' },
        { text: 'בכל שלב: כמה פעמים נכנס המחלק, כותבים למעלה, ומורידים את הספרה הבאה.' },
        { text: `${fmt(n)} ÷ ${d} = ?`, answer: q },
      ],
    });
  }

  // Whole-ten divisors — the only two-digit divisors grade 4 meets.
  for (const [q, d] of [[7, 20], [12, 30], [9, 40], [15, 50], [8, 60], [11, 70], [6, 80], [13, 90]]) {
    yield buildItem({
      itemId: `G_DL_TEN_${q * d}_${d}`, skillCode: DL,
      question: `כמה זה ${fmt(q * d)} ÷ ${d}?`,
      correct: q, signature: q * 10, signatureCode: 'ERR_ZERO_COUNT', distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'מוחקים אפס משני המספרים.' },
        { text: `${q * d / 10} ÷ ${d / 10} = ?`, answer: q },
      ],
    });
  }
}

// ─── NUM_DIVISIBILITY ────────────────────────────────────────────────────────

const DV = 'NUM_DIVISIBILITY';

const RULES: Record<number, string> = {
  2:  'מספר מתחלק ב-2 אם ספרת האחדות שלו זוגית.',
  3:  'מספר מתחלק ב-3 אם סכום ספרותיו מתחלק ב-3.',
  5:  'מספר מתחלק ב-5 אם ספרת האחדות היא 0 או 5.',
  6:  'מספר מתחלק ב-6 אם הוא מתחלק גם ב-2 וגם ב-3.',
  9:  'מספר מתחלק ב-9 אם סכום ספרותיו מתחלק ב-9.',
  10: 'מספר מתחלק ב-10 אם ספרת האחדות היא 0.',
};

const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0);

function* divisibility(): Generator<PracticeItem> {
  const numbers = [342, 455, 630, 728, 819, 1_230, 2_475, 3_186, 4_050, 5_544, 693, 870];
  for (const n of numbers) {
    for (const d of [2, 3, 5, 6, 9, 10]) {
      const yes = n % d === 0;
      yield buildItem({
        itemId: `G_DV_${n}_${d}`, skillCode: DV,
        question: `האם ${fmt(n)} מתחלק ב-${d} בלי שארית?`,
        correct: yes ? 'כן' : 'לא',
        signature: null, signatureCode: null,
        distractors: [yes ? 'לא' : 'כן'], exactOptions: true,
        cpaLayer: 'abstract', difficulty: d === 2 || d === 10 ? 1 : d === 5 ? 2 : 3, rng: () => 0.5,
        steps: [
          { text: RULES[d] },
          ...(d === 3 || d === 9 || d === 6
            ? [{ text: `סכום הספרות של ${fmt(n)} הוא ${digitSum(n)}.` }]
            : [{ text: `ספרת האחדות של ${fmt(n)} היא ${n % 10}.` }]),
          { text: `לכן התשובה היא ${yes ? 'כן' : 'לא'}.` },
        ],
      });
    }
  }
}

// ─── NUM_PRIMES ──────────────────────────────────────────────────────────────

const PR = 'NUM_PRIMES';

const divisorsOf = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i + 1).filter(d => n % d === 0);

/** Prime factorisation as a multiplication sentence: 18 → "2 × 3 × 3". */
function factorise(n: number): string {
  const out: number[] = [];
  let rest = n;
  for (let p = 2; p <= rest; p++) {
    while (rest % p === 0) { out.push(p); rest /= p; }
  }
  return out.join(' × ');
}

function* primes(): Generator<PracticeItem> {
  const nums = [7, 9, 11, 12, 15, 17, 18, 21, 23, 25, 28, 29, 31, 33, 36, 37, 41, 45, 49, 51];
  for (const n of nums) {
    const isPrime = divisorsOf(n).length === 2;
    yield buildItem({
      itemId: `G_PR_IS_${n}`, skillCode: PR,
      question: `האם ${n} הוא מספר ראשוני?`,
      correct: isPrime ? 'כן' : 'לא', signature: null, signatureCode: null,
      distractors: [isPrime ? 'לא' : 'כן'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: n > 30 ? 3 : 2, rng: () => 0.5,
      steps: [
        { text: 'מספר ראשוני מתחלק רק ב-1 ובעצמו.' },
        { text: isPrime
            ? `אי אפשר לחלק את ${n} בשום מספר אחר — הוא ראשוני.`
            : `${n} מתחלק גם ב-${divisorsOf(n)[1]}, ולכן הוא פריק.` },
      ],
    });
  }

  for (const n of [12, 18, 20, 24, 28, 30, 36, 45, 50, 60]) {
    yield buildItem({
      itemId: `G_PR_COUNT_${n}`, skillCode: PR,
      question: `כמה מחלקים יש ל-${n}?`,
      correct: divisorsOf(n).length, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: 'עוברים על המספרים מ-1 עד המספר עצמו ובודקים מי מחלק בלי שארית.' },
        { text: `המחלקים הם: ${divisorsOf(n).join(', ')}.`, answer: divisorsOf(n).length },
      ],
    });

    yield buildItem({
      itemId: `G_PR_FACT_${n}`, skillCode: PR,
      question: `מהו הפירוק של ${n} לגורמים ראשוניים?`,
      correct: factorise(n),
      signature: null, signatureCode: null,
      distractors: [factorise(n * 2), factorise(n + 2)], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: 'מחלקים שוב ושוב במספרים ראשוניים קטנים: 2, 3, 5…' },
        { text: `${n} = ${factorise(n)}.` },
      ],
    });
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateMultByTens   = (o: GenerateOpts) => take(multByTens(), o);
export const generateMultDivLink  = (o: GenerateOpts) => take(multDivLink(), o);
export const generateMultVertical = (o: GenerateOpts) => take(multVertical(), o);
export const generateDivOneDigit  = (o: GenerateOpts) => take(divOneDigit(), o);
export const generateDivLong      = (o: GenerateOpts) => take(divLong(), o);
export const generateDivisibility = (o: GenerateOpts) => take(divisibility(), o);
export const generatePrimes       = (o: GenerateOpts) => take(primes(), o);
