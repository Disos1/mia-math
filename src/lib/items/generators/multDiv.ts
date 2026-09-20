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
  for (let a = 3; a <= 9; a++) {
    for (let b = 3; b <= 12; b++) {
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
  }

  // Brackets change the answer — swept over triples that divide exactly.
  for (let b = 2; b <= 9; b++) {
    for (let c = 2; c <= 9; c++) {
      for (let q = 2; q <= 9; q++) {
        const a = b * c * q;
        if (a > 400 || (a / b) * c === a / (b * c)) continue;
        yield buildItem({
          itemId: `G_ML_PAR_${a}_${b}_${c}`, skillCode: ML,
          question: `כמה זה ${a} ÷ (${b} × ${c})?`,
          correct: q,
          signature: (a / b) * c, signatureCode: 'ERR_ORDER_OPS',
          distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
          steps: [
            { text: 'קודם מה שבתוך הסוגריים.' },
            { text: `${b} × ${c} = ?`, answer: b * c },
            { text: `${a} ÷ ${b * c} = ?`, answer: q },
          ],
        });
      }
    }
  }
}

// ─── ARITH_MULT_VERTICAL ─────────────────────────────────────────────────────

const MV = 'ARITH_MULT_VERTICAL';

function* multVertical(): Generator<PracticeItem> {
  // Two digits × one digit — swept, skipping any with nothing to carry.
  for (let a = 13; a <= 98; a += 3) {
    for (let b = 3; b <= 9; b++) {
      if ((a % 10) * b < 10 && Math.floor(a / 10) * b < 10) continue;
      const naive  = digitwise(a, b);
      const usable = naive !== a * b && String(naive).length <= String(a * b).length + 1;
      yield buildItem({
        itemId: `G_MV_ONE_${a}_${b}`, skillCode: MV,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: usable ? naive : null,
        signatureCode: usable ? 'ERR_MULT_PLACEHOLDER' : null,
        distractors: [], cpaLayer: 'abstract',
        difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'כופלים ספרה-ספרה מימין לשמאל, והנשא עובר הלאה.' },
          { text: `${a} × ${b} = ?`, answer: a * b },
        ],
      });
    }
  }

  // Two digits × two digits — where the place-holder zero lives.
  for (let a = 23; a <= 97; a += 7) {
    for (let b = 12; b <= 39; b += 3) {
      const tens = Math.floor(b / 10), ones = b % 10;
      if (ones === 0) continue;                 // whole tens belong to MULT_BY_TENS
      const naive = a * ones + a * tens;
      yield buildItem({
        itemId: `G_MV_TWO_${a}_${b}`, skillCode: MV,
        question: `כמה זה ${a} × ${b}?`,
        correct: a * b,
        signature: naive !== a * b ? naive : null,
        signatureCode: naive !== a * b ? 'ERR_MULT_PLACEHOLDER' : null,
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
  for (let n = 27; n <= 420; n += 11) {
    for (let d = 3; d <= 9; d += 2) {
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

      if (r === 0) continue;

      yield buildItem({
        itemId: `G_D1_R_${n}_${d}`, skillCode: D1,
        question: `${n} ÷ ${d} — מה השארית?`,
        correct: r,
        signature: d - r !== r ? d - r : null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `${d} × ${q} = ${d * q}.` },
          { text: `${n} − ${d * q} = ?`, answer: r },
          { text: `השארית תמיד קטנה מ-${d}.` },
        ],
      });

      if (n % 3 !== 0) continue;                 // keep the three kinds balanced
      yield buildItem({
        itemId: `G_D1_FULL_${n}_${d}`, skillCode: D1,
        question: `כמה זה ${n} ÷ ${d}?`,
        correct: `${q} שארית ${r}`,
        signature: d - r !== r ? `${q} שארית ${d - r}` : null, signatureCode: null,
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
  for (let n = 1_128; n <= 9_800; n += 311) {
    for (const d of [3, 4, 6, 7, 8, 9]) {
      const q = Math.floor(n / d), r = n % d;
      yield buildItem({
        itemId: `G_DL_${n}_${d}`, skillCode: DL,
        question: r === 0
          ? `כמה זה ${fmt(n)} ÷ ${d}?`
          : `${fmt(n)} ÷ ${d} — כמה יוצא (בלי השארית)?`,
        correct: q, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'בחילוק ארוך מתקדמים ספרה-ספרה משמאל לימין.' },
          { text: 'בכל שלב: כמה פעמים נכנס המחלק, כותבים למעלה, ומורידים את הספרה הבאה.' },
          { text: `${fmt(n)} ÷ ${d} = ?`, answer: q },
        ],
      });
    }
  }

  // Whole-ten divisors — the only two-digit divisors grade 4 meets.
  for (let q = 4; q <= 19; q++) {
    for (const d of [20, 30, 40, 50, 60, 70, 80, 90]) {
      const naive  = q * 10;
      const usable = String(naive).length <= String(q).length + 1;
      yield buildItem({
        itemId: `G_DL_TEN_${q * d}_${d}`, skillCode: DL,
        question: `כמה זה ${fmt(q * d)} ÷ ${d}?`,
        correct: q,
        signature: usable ? naive : null,
        signatureCode: usable ? 'ERR_ZERO_COUNT' : null,
        distractors: [], cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: 'מוחקים אפס משני המספרים.' },
          { text: `${q * d / 10} ÷ ${d / 10} = ?`, answer: q },
        ],
      });
    }
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
  // Swept: every rule against numbers spread across the range, so each rule
  // meets both its yes and its no cases many times over.
  for (let n = 102; n <= 5_400; n += 137) {
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
  for (let n = 5; n <= 100; n++) {
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

  for (let n = 12; n <= 96; n += 2) {
    if (divisorsOf(n).length === 2) continue;      // a prime has nothing to factorise
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
