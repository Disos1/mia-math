/**
 * FRAC_OF_QUANTITY — what's a fraction of a whole number.
 *
 * Unit fractions only (1/2, 1/3, 1/4, 1/5, 1/6) over quantities divisible
 * by the denominator. Signature distractor: q × d (multiply instead of
 * divide — ERR_FRAC_QUANTITY_BIAS).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'FRAC_OF_QUANTITY';

interface FracWord { d: number; word: string; }

const FRACTIONS: FracWord[] = [
  { d: 2, word: 'חצי'    },
  { d: 3, word: 'שליש'   },
  { d: 4, word: 'רבע'    },
  { d: 5, word: 'חמישית' },
  { d: 6, word: 'שישית'  },
];

function difficultyFor(d: number, q: number): number {
  if (d === 2 && q <= 20) return 1;
  if (d === 2) return 2;
  if (d <= 4 && q <= 24) return 2;
  return 3;
}

function* enumerate(): Generator<PracticeItem> {
  for (const { d, word } of FRACTIONS) {
    // q = d, 2d, 3d, ... up to 60
    for (let k = 1; k <= 12; k++) {
      const q = d * k;
      if (q > 60) break;
      if (q < d) continue; // need at least one piece
      const correct = q / d;
      const sig     = q * d;        // multiply-instead-of-divide misconception

      // Filler distractors:
      //  - the denominator itself (d)         — confusion of role
      //  - q − d                              — subtract instead of divide
      //  - correct − 1 / correct + 1          — off-by-one
      const fillers = [d, q - d, correct + 1, correct - 1].filter(x => x > 0 && x !== correct && x !== sig);

      yield buildItem({
        itemId:        `G_FRAC_QTY_${d}_${q}`,
        skillCode:     SKILL,
        question:      `כמה זה ${word} מ-${q}?`,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_FRAC_QUANTITY_BIAS',
        distractors:   fillers.slice(0, 2),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(d, q),
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
