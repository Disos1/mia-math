/**
 * Fractions booklet, units 1–2 (ה.ש.ב.ח.ה ד' "שברים פשוטים", pp. 7–28).
 *
 *   FRAC_PART_WHOLE   — השבר כחלק משלם: a fraction's name comes from the number
 *                       of equal parts; numerator and denominator and their roles.
 *   FRAC_COMPARE_SAME — השוואת שברים: same denominator (bigger numerator is
 *                       bigger) and same numerator (smaller denominator is bigger).
 *
 * Unit fractions (½ vs ⅓) are already covered by FRAC_COMPARE_UNIT, which she has
 * mastered; these extend exactly as the book does, to 3/8 vs 5/8 and 3/5 vs 3/8.
 *
 * Layers: a figure that IS the question ("what part is shaded?") is abstract —
 * the ledger counts only abstract answers towards mastery, so tagging these
 * pictorial would make the skill impossible to graduate.
 *
 * Comparison answers are always full expressions ("3/5 > 3/8"), never a bare
 * sign: a lone ">" on an RTL page is bidi-mirrored and would DISPLAY as "<"
 * while the app scores it as ">". MathText isolates whole expressions as LTR.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const frac = (n: number, d: number) => `${n}/${d}`;

/** Hebrew name of one part, as the book teaches it (שם השבר). */
export const PART_NAME: Record<number, string> = {
  2: 'חצי', 3: 'שליש', 4: 'רבע', 5: 'חמישית', 6: 'שישית',
  7: 'שביעית', 8: 'שמינית', 9: 'תשיעית', 10: 'עשירית',
};

// ─── FRAC_PART_WHOLE ─────────────────────────────────────────────────────────

const PW = 'FRAC_PART_WHOLE';

function* partWholeShaded(): Generator<PracticeItem> {
  // "What part of the circle is shaded?" — shaded k of n.
  // Signature: k/(n−k), the shaded-to-unshaded ratio instead of shaded-to-whole.
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 12]) {
    for (let k = 1; k < n; k++) {
      if (k === n - k) continue;          // k/(n−k) would be 1 — not diagnostic
      const correct = frac(k, n);
      const partPart = frac(k, n - k);
      yield buildItem({
        itemId:        `G_FPW_SHADE_${k}_${n}`,
        skillCode:     PW,
        question:      'איזה חלק מהעיגול צבוע?',
        correct,
        signature:     partPart,
        signatureCode: 'ERR_PART_PART',
        distractors:   [frac(n - k, n), frac(n, k)],
        visual:        { type: 'fraction_circles', partsA: n, labelA: '', partsB: n, labelB: '', shadedA: k, single: true },
        cpaLayer:      'abstract',
        difficulty:    n <= 4 ? 1 : n <= 6 ? 2 : 3,
        rng:           () => 0.5,
        steps: [
          { text: 'לכמה חלקים שווים חולק העיגול כולו?', answer: n },
          { text: 'כמה חלקים צבועים?', answer: k },
          { text: `המכנה הוא כל החלקים (${n}), המונה הוא הצבועים (${k}). לכן הצבוע הוא ${correct}.` },
        ],
      });
    }
  }
}

function* partWholeNaming(): Generator<PracticeItem> {
  // "A whole was cut into 8 equal parts — what is each part called?"
  const denoms = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12];
  for (const d of denoms) {
    // Three nearest part-names: the confusable ones, and always a full set of four.
    const neighbours = denoms.filter(x => x !== d)
      .sort((a, b) => Math.abs(a - d) - Math.abs(b - d) || a - b).slice(0, 3);
    yield buildItem({
      itemId:        `G_FPW_NAME_${d}`,
      skillCode:     PW,
      question:      `חילקו שלם ל-${d} חלקים שווים. איך קוראים לכל חלק?`,
      correct:       PART_NAME[d],
      signature:     null,
      signatureCode: null,
      distractors:   neighbours.map(x => PART_NAME[x]),
      cpaLayer:      'abstract',
      difficulty:    1,
      rng:           () => 0.5,
      steps: [
        { text: 'שם החלק בא ממספר החלקים השווים.', answer: undefined },
        { text: `${d} חלקים שווים — כל חלק נקרא ${PART_NAME[d]}.` },
      ],
    });
  }
}

function* partWholeRoles(): Generator<PracticeItem> {
  // "In 3/7, what is the denominator?" Signature: the numerator (roles swapped).
  const pairs: Array<[number, number]> = [];
  for (let d = 3; d <= 12; d++) for (let n = 1; n < d; n++) pairs.push([n, d]);
  for (const [n, d] of pairs) {
    for (const ask of ['מכנה', 'מונה'] as const) {
      const correct = ask === 'מכנה' ? d : n;
      const swapped = ask === 'מכנה' ? n : d;
      yield buildItem({
        itemId:        `G_FPW_ROLE_${n}_${d}_${ask === 'מכנה' ? 'D' : 'N'}`,
        skillCode:     PW,
        question:      `בשבר ${frac(n, d)} — מהו ה${ask}?`,
        correct,
        signature:     swapped,
        signatureCode: 'ERR_NUM_DEN_SWAP',
        distractors:   [n + d],
        cpaLayer:      'abstract',
        difficulty:    1,
        answerMode:    'keypad',
        rng:           () => 0.5,
        steps: [
          { text: 'המכנה (למטה) — לכמה חלקים שווים חילקו את השלם.' },
          { text: 'המונה (למעלה) — כמה חלקים לקחנו.' },
          { text: `אז ה${ask} בשבר ${frac(n, d)} הוא:`, answer: correct },
        ],
      });
    }
  }
}

export function generatePartWhole(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...partWholeShaded(), ...partWholeNaming(), ...partWholeRoles()], opts);
}

// ─── FRAC_COMPARE_SAME ───────────────────────────────────────────────────────

const CS = 'FRAC_COMPARE_SAME';

function* sameDenominator(): Generator<PracticeItem> {
  // 3/8 vs 5/8 — bigger numerator is bigger. The anchor case: no misconception
  // signature, because the whole-number rule happens to be right here.
  for (const d of [4, 5, 6, 7, 8, 9, 10]) {
    for (let a = 1; a < d; a++) {
      for (let b = a + 1; b < d; b++) {
        if (b - a < 2 && d > 6) continue;   // thin the grid, keep contrast visible
        const pictorial = (a + b + d) % 2 === 0;
        yield buildItem({
          itemId:        `G_FCS_DEN_${a}_${b}_${d}${pictorial ? '_P' : ''}`,
          skillCode:     CS,
          question:      `איזה שבר גדול יותר: ${frac(a, d)} או ${frac(b, d)}?`,
          correct:       frac(b, d),
          signature:     null,
          signatureCode: null,
          // Same two extra choices as the unit-fraction skill she already knows.
          distractors:   [frac(a, d), 'שווים', 'אי אפשר לדעת'],
          visual:        pictorial
            ? { type: 'fraction_circles', partsA: d, labelA: frac(a, d), partsB: d, labelB: frac(b, d), shadedA: a, shadedB: b }
            : null,
          cpaLayer:      pictorial ? 'pictorial' : 'abstract',
          difficulty:    1,
          rng:           () => 0.5,
          steps: [
            { text: `בשני השברים חילקו ל-${d} חלקים שווים — אז כל החלקים באותו גודל.`, answer: undefined },
            { text: `ב-${frac(b, d)} לוקחים יותר חלקים. כמה?`, answer: b },
            { text: `לכן ${frac(b, d)} גדול יותר.` },
          ],
        });
      }
    }
  }
}

function* sameNumerator(): Generator<PracticeItem> {
  // 3/5 vs 3/8 — the documented whole-number bias picks 3/8 "because 8 > 5"
  // (validated catalogue: "Compare 3/8 and 3/5: selects 3/8 as larger").
  const denoms = [3, 4, 5, 6, 7, 8, 9, 10];
  for (let a = 2; a <= 5; a++) {
    for (const m of denoms) {
      for (const n of denoms) {
        if (!(a < m && m < n)) continue;
        if (n - m < 2) continue;
        const pictorial = (a + m) % 3 === 0;
        yield buildItem({
          itemId:        `G_FCS_NUM_${a}_${m}_${n}${pictorial ? '_P' : ''}`,
          skillCode:     CS,
          question:      `איזה שבר גדול יותר: ${frac(a, n)} או ${frac(a, m)}?`,
          correct:       frac(a, m),
          signature:     frac(a, n),
          signatureCode: 'ERR_FRACTION_BIAS',
          distractors:   ['שווים', 'אי אפשר לדעת'],
          visual:        pictorial
            ? { type: 'fraction_circles', partsA: n, labelA: frac(a, n), partsB: m, labelB: frac(a, m), shadedA: a, shadedB: a }
            : null,
          cpaLayer:      pictorial ? 'pictorial' : 'abstract',
          difficulty:    n - m >= 4 ? 2 : 3,
          rng:           () => 0.5,
          steps: [
            { text: `בשני השברים לוקחים ${a} חלקים. השאלה היא איזה חלקים גדולים יותר.` },
            { text: `${PART_NAME[m] ?? frac(1, m)} או ${PART_NAME[n] ?? frac(1, n)} — לכמה חלקים חילקו כשהחלקים קטנים יותר?`, answer: n },
            { text: `ככל שמחלקים ליותר חלקים, כל חלק קטן יותר. לכן ${frac(a, m)} גדול יותר.` },
          ],
        });
      }
    }
  }
}

function* expressionTruth(): Generator<PracticeItem> {
  // "Which statement is true?" — three options cut guessing to 1-in-3.
  // Options are FULL expressions so no bare comparison sign ever reaches a button.
  const cases: Array<{ big: string; small: string; sig: boolean; id: string }> = [];
  for (const [a, m, n] of [[2, 3, 5], [3, 4, 7], [2, 5, 9], [3, 5, 8], [4, 6, 9], [2, 4, 10]] as const) {
    cases.push({ big: frac(a, m), small: frac(a, n), sig: true,  id: `N_${a}_${m}_${n}` });
  }
  for (const [a, b, d] of [[2, 5, 7], [3, 7, 9], [1, 4, 6], [4, 7, 8], [2, 3, 5], [3, 8, 10]] as const) {
    cases.push({ big: frac(b, d), small: frac(a, d), sig: false, id: `D_${a}_${b}_${d}` });
  }
  for (const c of cases) {
    const right = `${c.big} > ${c.small}`;
    const wrong = `${c.big} < ${c.small}`;
    yield buildItem({
      itemId:        `G_FCS_EXPR_${c.id}`,
      skillCode:     CS,
      question:      'איזה ביטוי נכון?',
      correct:       right,
      // Only the same-numerator case has a documented misconception behind "<".
      signature:     c.sig ? wrong : null,
      signatureCode: c.sig ? 'ERR_FRACTION_BIAS' : null,
      distractors:   c.sig
        ? [`${c.big} = ${c.small}`, 'אי אפשר לדעת']
        : [wrong, `${c.big} = ${c.small}`, 'אי אפשר לדעת'],
      cpaLayer:      'abstract',
      difficulty:    c.sig ? 3 : 2,
      rng:           () => 0.5,
      steps: [
        { text: c.sig
            ? 'אותו מונה — משווים את גודל החלקים: מכנה קטן יותר = חלקים גדולים יותר.'
            : 'אותו מכנה — כל החלקים באותו גודל, משווים כמה חלקים לקחו.' },
        { text: `לכן ${c.big} גדול יותר.` },
      ],
    });
  }
}

export function generateCompareSame(opts: GenerateOpts): PracticeItem[] {
  return pickFromCombos([...sameDenominator(), ...sameNumerator(), ...expressionTruth()], opts);
}
