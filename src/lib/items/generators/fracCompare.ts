/**
 * FRAC_COMPARE_UNIT — compare two unit fractions.
 *
 * Items pair 1/m vs 1/n where m < n. The signature distractor is the fraction
 * with the LARGER denominator (the "bigger denominator = bigger piece"
 * misconception, ERR_FRACTION_BIAS).
 *
 * Half the pool is pictorial (fraction_circles visual), half abstract.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'FRAC_COMPARE_UNIT';

const GLYPHS: Record<number, string> = {
  2:  '½',
  3:  '⅓',
  4:  '¼',
  5:  '⅕',
  6:  '⅙',
  7:  '⅐',
  8:  '⅛',
  10: '⅒',
};

function glyph(d: number): string {
  return GLYPHS[d] ?? `1/${d}`;
}

function difficultyFor(m: number, n: number): number {
  // Bigger pieces (1/2 vs 1/8) are easier; closer denominators (1/3 vs 1/4) are harder.
  const ratio = n / m;
  if (ratio >= 3) return 1;
  if (ratio >= 2) return 2;
  return 3;
}

function* enumerate(): Generator<PracticeItem> {
  // Every denominator to 12: glyph() falls back to "1/d" where no single
  // character exists, so widening the range costs nothing in rendering.
  const denoms = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  for (const m of denoms) {
    for (const n of denoms) {
      if (m >= n) continue;
      const correctG   = glyph(m);
      const signatureG = glyph(n);
      const diff       = difficultyFor(m, n);

      // Pictorial variant
      yield buildItem({
        itemId:        `G_FRAC_CMP_${m}_${n}_PIC`,
        skillCode:     SKILL,
        question:      'איזה שבר גדול יותר?',
        correct:       correctG,
        signature:     signatureG,
        signatureCode: 'ERR_FRACTION_BIAS',
        distractors:   ['שווים', 'אי אפשר לדעת'],
        visual:        { type: 'fraction_circles', partsA: m, labelA: correctG, partsB: n, labelB: signatureG },
        cpaLayer:      'pictorial',
        difficulty:    diff,
        rng:           () => 0.5,
      });

      // Abstract variant
      yield buildItem({
        itemId:        `G_FRAC_CMP_${m}_${n}_ABS`,
        skillCode:     SKILL,
        question:      'איזה שבר גדול יותר?',
        correct:       correctG,
        signature:     signatureG,
        signatureCode: 'ERR_FRACTION_BIAS',
        distractors:   ['שווים', 'אי אפשר לדעת'],
        cpaLayer:      'abstract',
        difficulty:    Math.min(5, diff + 1), // abstract is one notch harder
        rng:           () => 0.5,
      });

      // The same pair, asked the other way round. Without this she can answer
      // every item by picking the bigger-looking fraction, whatever is asked.
      yield buildItem({
        itemId:        `G_FRAC_CMP_${m}_${n}_SMALL`,
        skillCode:     SKILL,
        question:      `איזה שבר קטן יותר?`,
        correct:       signatureG,          // 1/n with the bigger denominator
        signature:     correctG,            // picking the bigger fraction anyway
        signatureCode: 'ERR_FRACTION_BIAS',
        distractors:   ['שווים'],
        exactOptions:  true,
        cpaLayer:      'abstract',
        difficulty:    diff,
        rng:           () => 0.5,
        steps: [
          { text: 'ככל שמחלקים ליותר חלקים, כל חלק קטן יותר.' },
          { text: `לכן הקטן יותר הוא ${signatureG}.` },
        ],
      });

    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
