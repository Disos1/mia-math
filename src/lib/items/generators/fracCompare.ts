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
  const denoms = [2, 3, 4, 5, 6, 8, 10];
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
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
