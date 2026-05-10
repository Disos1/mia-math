/**
 * ARITH_SUB_REGROUP_ZERO — subtraction across zeros.
 *
 * Two templates:
 *   T1: A00 − B  where A∈[2..9], B∈[101..A·100−1]   (clean "200−89" shape)
 *   T2: A0X − B  where X∈[1..9] (single non-zero unit), B∈[..]    (e.g. 802−447)
 *
 * Signature distractor: column-wise abs difference (the "take smaller from
 * larger in each column" misconception). Filler distractors: ±10, swap last
 * two digits of the correct answer.
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';

const SKILL = 'ARITH_SUB_REGROUP_ZERO';

function colSig(a: number, b: number): number {
  // Take three digits of each (zero-pad), then abs-diff column-wise.
  const ah = Math.floor(a / 100), at = Math.floor((a % 100) / 10), au = a % 10;
  const bh = Math.floor(b / 100), bt = Math.floor((b % 100) / 10), bu = b % 10;
  return Math.abs(ah - bh) * 100 + Math.abs(at - bt) * 10 + Math.abs(au - bu);
}

function swapLast2(n: number): number {
  const u = n % 10, t = Math.floor(n / 10) % 10;
  return n - u - t * 10 + t + u * 10;
}

function difficultyFor(a: number, b: number): number {
  if (a <= 300) return 1;
  if (a <= 500) return 2;
  return 3;
}

function makeItem(a: number, b: number): PracticeItem {
  const correct = a - b;
  const sig     = colSig(a, b);
  const itemId  = `G_REGROUP_${a}_${b}`;
  // Sub-RNG seeded from itemId so distractor shuffle is stable per item.
  // (We don't need it here — buildItem shuffles using the caller's rng.)
  return buildItem({
    itemId,
    skillCode:     SKILL,
    question:      `כמה זה ${a} − ${b}?`,
    correct,
    signature:     sig === correct ? null : sig,
    signatureCode: sig === correct ? null : 'ERR_REGROUP_ZERO',
    distractors:   [correct + 10, correct - 10, swapLast2(correct)],
    cpaLayer:      'abstract',
    difficulty:    difficultyFor(a, b),
    rng:           () => 0.5, // distractor order is stable; pool shuffle handles variety
  });
}

function* enumerate(): Generator<PracticeItem> {
  // T1: A00 − B
  for (let A = 2; A <= 9; A++) {
    const a = A * 100;
    // pick B values that span 1..A·100−1 with a sensible step so we don't blow up
    for (let B = 50; B < a; B += 17) {
      if (B % 10 === 0) continue; // boring
      yield makeItem(a, B);
    }
  }
  // T2: A0X − B (single non-zero unit)
  for (let A = 2; A <= 9; A++) {
    for (const X of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const a = A * 100 + X;
      for (let B = 50; B < a; B += 23) {
        if (B % 10 === 0) continue;
        yield makeItem(a, B);
      }
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
