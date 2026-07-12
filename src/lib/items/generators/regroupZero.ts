/**
 * ARITH_SUB_REGROUP_ZERO — subtraction across zeros.
 *
 * Two templates:
 *   T1: A00 − B  where A∈[2..9], B∈[101..A·100−1]   (clean "200−89" shape)
 *   T2: A0X − B  where X∈[1..9] (single non-zero unit), B∈[..]    (e.g. 802−447)
 *
 * Answered on the keypad (constructed response — no options to guess from).
 * Every item carries a full פריטה walkthrough in `steps`: after a second miss
 * the learner solves the same problem column by column, typing each partial
 * result herself. Pictorial variants show the minuend as base-10 blocks.
 *
 * Signature distractor (kept for misconception detection on typed answers):
 * column-wise abs difference — the "take smaller from larger in each column"
 * misconception.
 */

import type { PracticeItem, WorkedStep } from '../../../types';
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

function difficultyFor(a: number, _b: number): number {
  if (a <= 300) return 1;
  if (a <= 500) return 2;
  return 3;
}

/**
 * Column-subtraction walkthrough with borrowing (פריטה), emitted as steps.
 * Steps that carry an `answer` pause for keypad input, so the learner
 * produces every partial result — and the final answer — herself.
 */
function borrowSteps(a: number, b: number): WorkedStep[] {
  let curU = a % 10, curT = Math.floor(a / 10) % 10, curH = Math.floor(a / 100);
  const bu = b % 10,  bt = Math.floor(b / 10) % 10,  bh = Math.floor(b / 100);
  const steps: WorkedStep[] = [];

  if (curU < bu) {
    if (curT === 0) {
      steps.push({ text: `אין עשרות לפרוט — פורטים מאה: נשארות ${curH - 1} מאות ומקבלים 10 עשרות.` });
      curH -= 1; curT = 10;
    }
    steps.push({ text: `${curU} קטן מ-${bu} — פורטים עשרת: נשארות ${curT - 1} עשרות, וביחידות יש עכשיו ${curU + 10}.` });
    curT -= 1; curU += 10;
  }
  steps.push({ text: `יחידות: כמה זה ${curU} − ${bu}?`, answer: curU - bu });

  if (curT < bt) {
    steps.push({ text: `${curT} קטן מ-${bt} — פורטים מאה: נשארות ${curH - 1} מאות ויש ${curT + 10} עשרות.` });
    curH -= 1; curT += 10;
  }
  steps.push({ text: `עשרות: כמה זה ${curT} − ${bt}?`, answer: curT - bt });

  if (bh > 0 || curH > 0) {
    steps.push({ text: `מאות: כמה זה ${curH} − ${bh}?`, answer: curH - bh });
  }
  steps.push({ text: `ועכשיו הכול ביחד: כמה זה ${a} − ${b}?`, answer: a - b });
  return steps;
}

function makeItem(a: number, b: number, pictorial: boolean): PracticeItem {
  const correct = a - b;
  const sig     = colSig(a, b);
  const itemId  = pictorial ? `G_REGROUP_P_${a}_${b}` : `G_REGROUP_${a}_${b}`;
  return buildItem({
    itemId,
    skillCode:     SKILL,
    question:      `כמה זה ${a} − ${b}?`,
    correct,
    signature:     sig === correct ? null : sig,
    signatureCode: sig === correct ? null : 'ERR_REGROUP_ZERO',
    distractors:   [correct + 10, correct - 10, swapLast2(correct)],
    visual:        pictorial
      ? {
          type:         'base10_blocks',
          hundreds:     Math.floor(a / 100),
          tens:         Math.floor((a % 100) / 10),
          ones:         a % 10,
          regroupLabel: `${a} בנוי ממאות, עשרות ויחידות — פורטים כשחסר`,
        }
      : null,
    cpaLayer:      pictorial ? 'pictorial' : 'abstract',
    difficulty:    difficultyFor(a, b),
    answerMode:    'keypad',
    steps:         borrowSteps(a, b),
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
      yield makeItem(a, B, false);
      yield makeItem(a, B, true);
    }
  }
  // T2: A0X − B (single non-zero unit)
  for (let A = 2; A <= 9; A++) {
    for (const X of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const a = A * 100 + X;
      for (let B = 50; B < a; B += 23) {
        if (B % 10 === 0) continue;
        yield makeItem(a, B, false);
        yield makeItem(a, B, true);
      }
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = Array.from(enumerate());
  return pickFromCombos(combos, opts);
}
