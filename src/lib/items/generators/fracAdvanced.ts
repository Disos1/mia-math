/**
 * Fractions booklet, units 3–9 (ה.ש.ב.ח.ה ד' "שברים פשוטים", pp. 29–148).
 *
 *   FRAC_COMPLETE_WHOLE — הרכבת השלם: how much is missing to reach 1, and
 *                         comparing two fractions by how far each is FROM 1.
 *   FRAC_IMPROPER       — שברים גדולים מ-1: improper ↔ mixed.
 *   FRAC_ADD_SUB_SAME   — חיבור וחיסור במכנים שווים.
 *   FRAC_MIXED_ADD_SUB  — חיבור וחיסור מספרים מעורבים.
 *   FRAC_EQUIVALENT     — שמות שונים לשבר.
 *   FRAC_ADD_SUB_DIFF   — מכנים שונים, and in grade 4 only where one denominator
 *                         divides the other (2 and 4, 3 and 6) — no LCM work.
 *
 * Grade-4 rules honoured throughout: denominators ≤ 12, no decimals, and a
 * result equal to one whole is written as a whole ("1"), not as 8/8.
 *
 * The signature everywhere is ERR_ADD_DENOMINATORS — adding across the bar
 * (3/8 + 2/8 = 5/16). Unlike the invented codes, this one IS in the validated
 * research catalogue, corroborated by three independent reports.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { PART_NAME } from './fracBasics';

/** Plural part names — "כמה שמיניות חסרות?" */
export const PART_PLURAL: Record<number, string> = {
  2: 'חצאים', 3: 'שלישים', 4: 'רבעים', 5: 'חמישיות', 6: 'שישיות',
  7: 'שביעיות', 8: 'שמיניות', 9: 'תשיעיות', 10: 'עשיריות', 12: 'שתים-עשריות',
};

/**
 * Hebrew gender of the plural part name: חצאים/שלישים/רבעים are masculine,
 * חמישיות and everything above are feminine. The verb has to agree, or the
 * question reads wrong to a Hebrew-speaking child ("כמה שלישים חסרות").
 */
const isFem = (d: number) => d >= 5;
const missingVerb  = (d: number) => (isFem(d) ? 'חסרות' : 'חסרים');
const makeUpVerb   = (d: number) => (isFem(d) ? 'מרכיבות' : 'מרכיבים');
const equalVerb    = (d: number) => (isFem(d) ? 'שוות' : 'שווים');

const frac  = (a: number, b: number) => `${a}/${b}`;
/** A mixed number as one bidi-isolated run — MathText keeps "2 1/3" together. */
const mixed = (w: number, a: number, b: number) =>
  (a === 0 ? `${w}` : w === 0 ? `${a}/${b}` : `${w} ${a}/${b}`);

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// ─── FRAC_COMPLETE_WHOLE ─────────────────────────────────────────────────────

const CW = 'FRAC_COMPLETE_WHOLE';

function* completeWhole(): Generator<PracticeItem> {
  for (const d of [3, 4, 5, 6, 8, 10, 12]) {
    for (let a = 1; a < d; a++) {
      if (d >= 10 && a % 2 === 0) continue;             // keep the pool sane
      const missing = d - a;
      yield buildItem({
        itemId:    `G_CW_MISS_${a}_${d}`, skillCode: CW,
        question:  `כמה ${PART_PLURAL[d]} ${missingVerb(d)} ל-${frac(a, d)} כדי להשלים שלם?`,
        correct:   missing,
        // Answering the denominator = "a whole is d parts, so d more are needed".
        signature: missing === d ? null : d,
        signatureCode: null,
        distractors: [], cpaLayer: 'abstract', difficulty: d <= 5 ? 1 : 2,
        answerMode: 'keypad', rng: () => 0.5,
        visual: { type: 'fraction_circles', partsA: d, labelA: frac(a, d), partsB: d, labelB: '', shadedA: a, single: true },
        steps: [
          { text: `שלם שלם מורכב מ-${d} ${PART_PLURAL[d]}.` },
          { text: `כבר יש ${a}. כמה חסרות כדי להגיע ל-${d}?`, answer: missing },
        ],
      });
    }
  }

  // "How many eighths make a whole?" — the idea underneath all of it.
  for (const d of [3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    yield buildItem({
      itemId: `G_CW_UNIT_${d}`, skillCode: CW,
      question: `כמה ${PART_PLURAL[d]} ${makeUpVerb(d)} שלם אחד?`,
      correct: d, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 1, answerMode: 'keypad', rng: () => 0.5,
      steps: [{ text: `${PART_NAME[d] ?? ''} הוא חלק אחד מתוך ${d} חלקים שווים.` },
              { text: 'כמה חלקים כאלה מרכיבים שלם?', answer: d }],
    });
  }

  // Compare by the gap to 1 — the whole point of the unit. Both fractions are
  // one part short, so the one cut into MORE parts is the bigger number, which
  // is exactly the intuition ERR_FRACTION_BIAS gets backwards.
  const near: Array<[number, number]> = [[3, 4], [4, 5], [5, 6], [6, 8], [8, 10], [4, 6], [5, 8], [3, 6], [6, 12], [8, 12]];
  for (const [p, q] of near) {
    const A = frac(p - 1, p), B = frac(q - 1, q);   // (p−1)/p vs (q−1)/q
    const bigger = p > q ? A : B;
    const smaller = p > q ? B : A;
    yield buildItem({
      itemId: `G_CW_NEAR_${p}_${q}`, skillCode: CW,
      question: `לשני השברים חסר חלק אחד כדי להשלים שלם. איזה שבר גדול יותר: ${A} או ${B}?`,
      correct: bigger,
      signature: smaller,                 // picks by "bigger denominator = smaller"
      signatureCode: 'ERR_FRACTION_BIAS',
      distractors: ['שווים'], exactOptions: true,
      cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `ל-${A} חסר ${frac(1, p)}, ול-${B} חסר ${frac(1, q)}.` },
        { text: 'ככל שהחלק החסר קטן יותר, השבר קרוב יותר לשלם — וגדול יותר.' },
        { text: `החלק החסר הקטן יותר שייך ל-${bigger}.` },
      ],
    });
  }
}

// ─── FRAC_IMPROPER ───────────────────────────────────────────────────────────

const IM = 'FRAC_IMPROPER';

function* improper(): Generator<PracticeItem> {
  const cases: Array<[number, number]> = [
    [7, 3], [5, 2], [9, 4], [11, 4], [7, 5], [13, 5], [8, 3], [11, 3],
    [9, 2], [13, 6], [17, 8], [11, 8], [15, 4], [19, 10], [14, 5], [10, 3],
  ];
  for (const [n, d] of cases) {
    const whole = Math.floor(n / d);
    const rest  = n % d;
    yield buildItem({
      itemId: `G_IM_WHOLES_${n}_${d}`, skillCode: IM,
      question: `כמה שלמים יש ב-${frac(n, d)}?`,
      correct: whole, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `כל ${d} ${PART_PLURAL[d]} הם שלם אחד.` },
        { text: `כמה פעמים נכנס ${d} בתוך ${n}?`, answer: whole },
      ],
    });

    yield buildItem({
      itemId: `G_IM_MIXED_${n}_${d}`, skillCode: IM,
      question: `איזה מספר מעורב שווה ל-${frac(n, d)}?`,
      correct: mixed(whole, rest, d),
      // Whole and remainder read off in the wrong order. Where the two happen to
      // be equal (8/3 → "2 2/3") the swap IS the right answer, so claim nothing.
      signature: rest !== whole && whole < d && rest > 0 ? mixed(rest, whole, d) : null,
      signatureCode: null,
      distractors: [mixed(whole + 1, rest, d), mixed(whole, rest === 0 ? 1 : (rest % d) + (rest + 1 < d ? 1 : -1), d)],
      exactOptions: true, cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
      steps: [
        { text: `${n} חלקי ${d}: ${whole} שלמים, ונשארו ${rest} ${PART_PLURAL[d]}.` },
        { text: `כותבים את זה ${mixed(whole, rest, d)}.` },
      ],
    });

    yield buildItem({
      itemId: `G_IM_BACK_${n}_${d}`, skillCode: IM,
      question: `כמה ${PART_PLURAL[d]} יש ב-${mixed(whole, rest, d)}?`,
      correct: n, signature: null, signatureCode: null, distractors: [],
      cpaLayer: 'abstract', difficulty: 3, answerMode: 'keypad', rng: () => 0.5,
      steps: [
        { text: `בכל שלם יש ${d} ${PART_PLURAL[d]}, ויש ${whole} שלמים.` },
        { text: `${whole} × ${d} = ?`, answer: whole * d },
        { text: `מוסיפים את ${rest} שנשארו.`, answer: n },
      ],
    });
  }
}

// ─── FRAC_ADD_SUB_SAME ───────────────────────────────────────────────────────

const AS = 'FRAC_ADD_SUB_SAME';

/** Result as the child should write it: a whole number when it lands on 1. */
const sumLabel = (n: number, d: number): string => (n === d ? '1' : frac(n, d));

function* addSubSame(): Generator<PracticeItem> {
  for (const d of [3, 4, 5, 6, 8, 10, 12]) {
    for (let a = 1; a < d; a++) {
      for (const b of [1, 2, 3]) {
        if (a + b > d) continue;
        if (d >= 10 && (a + b) % 2 === 1) continue;
        yield buildItem({
          itemId: `G_AS_ADD_${a}_${b}_${d}`, skillCode: AS,
          question: `כמה זה ${frac(a, d)} + ${frac(b, d)}?`,
          correct:  sumLabel(a + b, d),
          signature: frac(a + b, d + d),          // added across the bar
          signatureCode: 'ERR_ADD_DENOMINATORS',
          distractors: [frac(a + b + 1, d), frac(Math.max(1, a - b), d)],
          exactOptions: true, cpaLayer: 'abstract',
          difficulty: a + b === d ? 3 : d <= 5 ? 1 : 2, rng: () => 0.5,
          steps: [
            { text: `המכנה אומר לאיזה גודל חלקים חילקו — הוא לא משתנה בחיבור.` },
            { text: `${a} ${PART_PLURAL[d]} ועוד ${b} — כמה חלקים?`, answer: a + b },
            ...(a + b === d ? [{ text: `${frac(d, d)} זה בדיוק שלם אחד.` }] : []),
          ],
        });
      }
    }

    for (let a = 2; a < d; a++) {
      for (const b of [1, 2]) {
        if (a - b < 0) continue;
        if (d >= 10 && a % 2 === 1) continue;
        yield buildItem({
          itemId: `G_AS_SUB_${a}_${b}_${d}`, skillCode: AS,
          question: `כמה זה ${frac(a, d)} − ${frac(b, d)}?`,
          correct: a - b === 0 ? '0' : frac(a - b, d),
          signature: null, signatureCode: null,
          distractors: [frac(a + b, d), frac(a - b === 0 ? 1 : a - b, Math.max(2, d - b))],
          exactOptions: true, cpaLayer: 'abstract', difficulty: d <= 5 ? 1 : 2, rng: () => 0.5,
          steps: [
            { text: 'בחיסור, כמו בחיבור, המכנה נשאר אותו מכנה.' },
            { text: `${a} ${PART_PLURAL[d]} פחות ${b} — כמה נשארו?`, answer: a - b },
          ],
        });
      }
    }
  }
}

// ─── FRAC_MIXED_ADD_SUB ──────────────────────────────────────────────────────

const MX = 'FRAC_MIXED_ADD_SUB';

function* mixedAddSub(): Generator<PracticeItem> {
  const cases: Array<[number, number, number, number]> = [
    // [whole, numerator, addend numerator, denominator]  — no regrouping needed
    [1, 2, 1, 5], [2, 1, 2, 5], [1, 1, 2, 4], [3, 1, 1, 4], [2, 3, 2, 8],
    [1, 4, 3, 8], [2, 2, 3, 6], [1, 1, 1, 3], [4, 2, 2, 6], [2, 5, 4, 10],
    [3, 3, 4, 10], [1, 5, 6, 12], [2, 1, 1, 2],
  ];
  for (const [w, a, b, d] of cases) {
    if (a + b >= d) continue;
    yield buildItem({
      itemId: `G_MX_ADD_${w}_${a}_${b}_${d}`, skillCode: MX,
      question: `כמה זה ${mixed(w, a, d)} + ${frac(b, d)}?`,
      correct: mixed(w, a + b, d),
      signature: mixed(w + b, a, d),        // added the fraction to the whole
      signatureCode: null,
      distractors: [mixed(w, a + b, d + d), mixed(w + 1, a + b, d)],   // second: whole carried without cause
      exactOptions: true, cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'השלמים נשארים כמו שהם — מחברים רק את השברים.' },
        { text: `${a} ${PART_PLURAL[d]} ועוד ${b} — כמה חלקים?`, answer: a + b },
        { text: `התשובה: ${mixed(w, a + b, d)}.` },
      ],
    });

    yield buildItem({
      itemId: `G_MX_SUB_${w}_${a}_${b}_${d}`, skillCode: MX,
      question: `כמה זה ${mixed(w, a + b, d)} − ${frac(b, d)}?`,
      correct: mixed(w, a, d),
      signature: mixed(w - 1, a, d), signatureCode: null,
      distractors: [mixed(w, Math.min(a + b + b, d - 1), d), mixed(w, Math.max(1, a - b), d)],
      exactOptions: true, cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
      steps: [
        { text: 'מחסרים רק את השברים; השלמים לא זזים.' },
        { text: `${a + b} ${PART_PLURAL[d]} פחות ${b} — כמה נשארו?`, answer: a },
        { text: `התשובה: ${mixed(w, a, d)}.` },
      ],
    });
  }
}

// ─── FRAC_EQUIVALENT ─────────────────────────────────────────────────────────

const EQ = 'FRAC_EQUIVALENT';

function* equivalent(): Generator<PracticeItem> {
  const bases: Array<[number, number]> = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [1, 6], [5, 6]];
  for (const [a, b] of bases) {
    for (const k of [2, 3, 4]) {
      const n = a * k, d = b * k;
      if (d > 12) continue;

      yield buildItem({
        itemId: `G_EQ_SIMPLIFY_${n}_${d}`, skillCode: EQ,
        question: `איזה שבר שווה ל-${frac(n, d)}?`,
        correct: frac(a, b),
        signature: frac(a, d),              // divided the numerator only
        signatureCode: null,
        distractors: [frac(n, b), frac(a + 1, b + 1)],
        exactOptions: true, cpaLayer: 'abstract', difficulty: 2, rng: () => 0.5,
        visual: { type: 'fraction_circles', partsA: d, labelA: frac(n, d), partsB: b, labelB: frac(a, b), shadedA: n, shadedB: a },
        steps: [
          { text: `כשמחלקים גם את המונה וגם את המכנה באותו מספר, השבר לא משתנה.` },
          { text: `${n} ÷ ${k} = ?`, answer: a },
          { text: `${d} ÷ ${k} = ?`, answer: b },
        ],
      });

      yield buildItem({
        itemId: `G_EQ_BUILD_${a}_${b}_${k}`, skillCode: EQ,
        question: `כמה ${PART_PLURAL[d]} ${equalVerb(d)} ל-${frac(a, b)}?`,
        correct: n, signature: null, signatureCode: null, distractors: [],
        cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad', rng: () => 0.5,
        steps: [
          { text: `מ-${b} חלקים ל-${d} חלקים: כל חלק התפצל ל-${k}.` },
          { text: `${a} × ${k} = ?`, answer: n },
        ],
      });
    }
  }
}

// ─── FRAC_ADD_SUB_DIFF ───────────────────────────────────────────────────────

const AD = 'FRAC_ADD_SUB_DIFF';

function* addSubDiff(): Generator<PracticeItem> {
  // Grade 4: one denominator divides the other, so only one fraction is rewritten.
  const pairs: Array<[number, number]> = [[2, 4], [2, 6], [2, 8], [2, 10], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12]];
  for (const [small, big] of pairs) {
    const k = big / small;
    for (let a = 1; a < small; a++) {
      for (let b = 1; b < big; b++) {
        const num = a * k + b;
        if (num > big) continue;
        if (gcd(num, big) !== 1 && num !== big) continue;   // keep answers in lowest terms
        yield buildItem({
          itemId: `G_AD_ADD_${a}_${small}_${b}_${big}`, skillCode: AD,
          question: `כמה זה ${frac(a, small)} + ${frac(b, big)}?`,
          correct: sumLabel(num, big),
          signature: frac(a + b, small + big),      // added across both bars
          signatureCode: 'ERR_ADD_DENOMINATORS',
          distractors: [frac(a + b, big), frac(num, small)],
          exactOptions: true, cpaLayer: 'abstract', difficulty: 3, rng: () => 0.5,
          steps: [
            { text: `אי אפשר לחבר חלקים בגדלים שונים — קודם עושים להם שם משותף.` },
            { text: `כמה ${PART_PLURAL[big]} ${equalVerb(big)} ל-${frac(a, small)}?`, answer: a * k },
            { text: `${a * k} ועוד ${b} — כמה ${PART_PLURAL[big]}?`, answer: num },
          ],
        });
      }
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const take = (gen: Generator<PracticeItem>, opts: GenerateOpts) => pickFromCombos([...gen], opts);

export const generateCompleteWhole = (o: GenerateOpts) => take(completeWhole(), o);
export const generateImproper      = (o: GenerateOpts) => take(improper(), o);
export const generateAddSubSame    = (o: GenerateOpts) => take(addSubSame(), o);
export const generateMixedAddSub   = (o: GenerateOpts) => take(mixedAddSub(), o);
export const generateEquivalent    = (o: GenerateOpts) => take(equivalent(), o);
export const generateAddSubDiff    = (o: GenerateOpts) => take(addSubDiff(), o);
