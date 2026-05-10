/**
 * MEAS_UNIT_CONVERT_M — convert km+m into total m.
 *
 * Signature distractor: km × 100 + m (cm/m-scale habit applied to km/m).
 * Filler distractors: km + m (raw addition), km × 10 + m (mixed scale).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'MEAS_UNIT_CONVERT_M';

const KM_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const M_VALUES  = [0, 50, 100, 150, 200, 250, 300, 400, 500, 600, 750, 800, 900, 950];

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function difficultyFor(km: number, m: number): number {
  if (km === 1 && (m === 0 || m % 100 === 0)) return 1;
  if (m === 0) return 1;
  if (m % 100 !== 0) return 3; // odd-shaped m (250, 750, 950) is harder
  return 2;
}

function* enumerate(): Generator<PracticeItem> {
  for (const km of KM_VALUES) {
    for (const m of M_VALUES) {
      const correct = km * 1000 + m;
      const sig     = km * 100 + m;     // wrong-scale (×100 instead of ×1000)
      const sumOnly = km + m;
      const tenScale = km * 10 + m;

      const kmWord = plural(km, 'קילומטר', 'קילומטרים');
      const mWord  = 'מטרים';
      const question = m === 0
        ? `כמה מטרים יש ב-${km} ${kmWord}?`
        : `כמה ${mWord} יש ב-${km} ${kmWord} ו-${m} ${mWord}?`;

      yield buildItem({
        itemId:        `G_UNIT_M_${km}_${m}`,
        skillCode:     SKILL,
        question,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_UNIT_MISMATCH',
        distractors:   [sumOnly, tenScale, Math.floor(correct / 10)].filter(x => x !== correct && x !== sig && x > 0),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(km, m),
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
