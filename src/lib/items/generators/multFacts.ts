/**
 * ARITH_MULT_6_9 — multiplication facts in the 6–9 range.
 *
 * The fact space is intrinsically small (16 unique pairs), so variety comes
 * from question framing:
 *   F1: כמה זה a × b?                        (canonical)
 *   F2: כמה זה b × a?                        (commuted)
 *   F3: a שורות של b — כמה סך הכל?           (array model)
 *   F4: a קופסאות, בכל קופסה b — כמה סך הכל? (groups model)
 *   F5: missing factor: a × ? = a·b
 *   F6: missing factor: ? × b = a·b
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'ARITH_MULT_6_9';

interface Pair { a: number; b: number; }

function neighborProducts(a: number, b: number): number[] {
  // Off-by-one factor variants — the classic "near miss" misconceptions.
  return [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b].filter(x => x > 0);
}

function difficultyFor(a: number, b: number): number {
  const max = Math.max(a, b), min = Math.min(a, b);
  if (max <= 6) return 1;
  if (max <= 7) return 2;
  if (max === 8) return 2;
  if (min >= 8) return 3; // 8×8, 8×9, 9×8, 9×9
  return 2;
}

function* enumerate(): Generator<PracticeItem> {
  // Iterate canonical pairs only (a ≤ b); the commute is handled inside.
  const pairs: Pair[] = [];
  for (let a = 6; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      pairs.push({ a, b });
    }
  }

  for (const { a, b } of pairs) {
    const correct  = a * b;
    const neigh    = neighborProducts(a, b).filter(n => n !== correct);
    const diff     = difficultyFor(a, b);

    // F1 + F2: canonical and commuted "כמה זה X × Y"
    // Diagonal pairs (a == b) only get the canonical form to avoid duplicate IDs.
    const orderings: ReadonlyArray<readonly [number, number]> = a === b
      ? [[a, b]]
      : [[a, b], [b, a]];
    for (const [aa, bb] of orderings) {
      yield buildItem({
        itemId:        `G_MULT_${aa}X${bb}`,
        skillCode:     SKILL,
        question:      `כמה זה ${aa} × ${bb}?`,
        correct,
        signature:     null,
        signatureCode: 'ERR_MULT_FACT',
        distractors:   [neigh[0], neigh[1], neigh[2]].filter(x => x !== undefined) as number[],
        cpaLayer:      'abstract',
        difficulty:    diff,
        rng:           () => 0.5,
      });
    }

    // F3: array-model
    yield buildItem({
      itemId:        `G_MULT_ARRAY_${a}X${b}`,
      skillCode:     SKILL,
      question:      `יש ${a} שורות של ${b} כיסאות. כמה כיסאות יש בסך הכל?`,
      correct,
      signature:     null,
      signatureCode: 'ERR_MULT_FACT',
      distractors:   neigh.slice(0, 3),
      cpaLayer:      'abstract',
      difficulty:    diff,
      rng:           () => 0.5,
    });

    // F4: groups-model
    yield buildItem({
      itemId:        `G_MULT_GROUPS_${a}X${b}`,
      skillCode:     SKILL,
      question:      `${a} קופסאות, בכל אחת ${b} ממתקים. כמה ממתקים יש סך הכל?`,
      correct,
      signature:     null,
      signatureCode: 'ERR_MULT_FACT',
      distractors:   neigh.slice(0, 3),
      cpaLayer:      'abstract',
      difficulty:    diff,
      rng:           () => 0.5,
    });

    // F5: missing-factor a × ? = a·b — answer is b
    yield buildItem({
      itemId:        `G_MULT_MISS_B_${a}X${b}`,
      skillCode:     SKILL,
      question:      `${a} × ? = ${correct}`,
      correct:       b,
      signature:     null,
      signatureCode: 'ERR_MULT_FACT',
      distractors:   [b + 1, b - 1, a].filter(x => x > 0 && x !== b) as number[],
      cpaLayer:      'abstract',
      difficulty:    diff,
      rng:           () => 0.5,
    });

    // F6: missing-factor ? × b = a·b — answer is a
    if (a !== b) {
      yield buildItem({
        itemId:        `G_MULT_MISS_A_${a}X${b}`,
        skillCode:     SKILL,
        question:      `? × ${b} = ${correct}`,
        correct:       a,
        signature:     null,
        signatureCode: 'ERR_MULT_FACT',
        distractors:   [a + 1, a - 1, b].filter(x => x > 0 && x !== a) as number[],
        cpaLayer:      'abstract',
        difficulty:    diff,
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
