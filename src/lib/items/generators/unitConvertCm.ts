/**
 * MEAS_UNIT_CONVERT_CM — convert m+cm into total cm.
 *
 * Signature distractor: m + cm (raw addition, forgetting 1 m = 100 cm).
 * Filler distractors: m·1000 + cm (wrong scale), m·10 + cm/10 (mixed).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'MEAS_UNIT_CONVERT_CM';

const M_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CM_VALUES = [0, 5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 95];

function plural(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function difficultyFor(m: number, cm: number): number {
  if (m <= 2 && (cm === 0 || cm % 10 === 0)) return 1;
  if (cm < 10 && cm > 0) return 3; // single-digit cm is the trap (4m5cm style)
  return 2;
}

function* enumerate(): Generator<PracticeItem> {
  for (const m of M_VALUES) {
    for (const cm of CM_VALUES) {
      const correct = m * 100 + cm;
      const sig     = m + cm;
      const wrongScale = m * 1000 + cm;

      const meterWord = plural(m, 'מטר',     'מטרים');
      const cmWord    = 'סנטימטרים';
      const question  = cm === 0
        ? `כמה סנטימטרים יש ב-${m} ${meterWord}?`
        : `כמה ${cmWord} יש ב-${m} ${meterWord} ו-${cm} ${cmWord}?`;

      // Add some single-digit cm cases for difficulty 3 trap
      const fillerExtra = cm === 0 ? [] : [m * 10 + Math.floor(cm / 10)];

      yield buildItem({
        itemId:        `G_UNIT_CM_${m}_${cm}`,
        skillCode:     SKILL,
        question,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_UNIT_MISMATCH',
        distractors:   [wrongScale, ...fillerExtra, correct - 10, correct + 10].filter(x => x !== correct && x !== sig),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(m, cm),
        rng:           () => 0.5,
      });
    }
  }

  // Variant: small m, single-digit cm — captures the "4m5cm → 405" trap pattern
  for (const m of [1, 2, 3, 4, 5]) {
    for (const cm of [3, 7, 8]) {
      const correct = m * 100 + cm;
      const sig     = m + cm;
      const meterWord = plural(m, 'מטר', 'מטרים');
      yield buildItem({
        itemId:        `G_UNIT_CM_TRAP_${m}_${cm}`,
        skillCode:     SKILL,
        question:      `כמה סנטימטרים יש ב-${m} ${meterWord} ו-${cm} סנטימטרים?`,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_UNIT_MISMATCH',
        distractors:   [m * 1000 + cm, m * 10 + cm, correct + 100],
        cpaLayer:      'abstract',
        difficulty:    3,
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
