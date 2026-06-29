/**
 * ARITH_WORD_2STEP — two-step word problems (start + add − sub or start − sub + add).
 *
 * Two templates:
 *   T1: named actor — "ל{name} היו {a} {object}. {pronoun} {sub} {b}, ואז {add} עוד {c}…"
 *   T2: neutral scenario — "ב{place} {start} {a} {object}. {sub} {b}, ואחר כך {add} {c}…"
 *
 * Signature distractor: a + b + c (sum every number — ERR_NUMBER_GRAB).
 * Filler distractors: wrong-sign variants (a + b − c, a − b − c).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { NAMES, SUB_VERBS, ADD_VERBS, OBJECTS, NEUTRAL_SCENARIOS } from '../wordBank';

const SKILL = 'ARITH_WORD_2STEP';

function difficultyFor(a: number, b: number, c: number): number {
  if (a <= 25 && b + c <= 15) return 2;
  if (a <= 50) return 2;
  return 3;
}

/**
 * Wide grid of (a, b, c) triples for result a − b + c. Spans a ∈ 13..92 with
 * three (b, c) shapes per a → ~80 distinct number combinations (vs. the old 6),
 * so the *numbers* vary across problems and can't be memorised by rote.
 */
function numberTuples(): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 13; a <= 92; a += 3) {
    const variants: [number, number][] = [
      [Math.round(a * 0.35), 4 + (a % 9)],
      [Math.round(a * 0.55), 6 + (a % 7)],
      [Math.round(a * 0.45), 3 + (a % 11)],
    ];
    for (const [b0, c] of variants) {
      const b = Math.max(2, b0);
      if (a - b + c > 0) out.push([a, b, c]);
    }
  }
  return out;
}

const W2_TUPLES = numberTuples();

function* enumerateNamed(): Generator<PracticeItem> {
  // Each (actor, object) draws the next number-tuple from the wide grid, so
  // both the surface words AND the numbers rotate independently.
  let n = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const actor = NAMES[i];
    const pronoun = actor.gender === 'f' ? 'היא' : 'הוא';
    const possessive = actor.gender === 'f' ? 'לה' : 'לו';

    for (let oi = 0; oi < OBJECTS.length; oi += 2) {
      const obj = OBJECTS[oi];
      const sub = SUB_VERBS[(i + oi) % SUB_VERBS.length];
      const add = ADD_VERBS[(i + oi + 1) % ADD_VERBS.length];
      const subVerb = actor.gender === 'f' ? sub.f : sub.m;
      const addVerb = actor.gender === 'f' ? add.f : add.m;

      // 2 distinct tuples per (actor, object), advancing through the whole grid
      for (let k = 0; k < 2; k++) {
        const [a, b, c] = W2_TUPLES[n % W2_TUPLES.length];
        n++;
        if (a - b + c <= 0) continue;
        const correct = a - b + c;
        const sig     = a + b + c;
        const wrongSign = a + b - c;
        const noAdd     = a - b - c;

        yield buildItem({
          itemId:        `G_W2_NAMED_${actor.name}_${obj}_${a}_${b}_${c}`,
          skillCode:     SKILL,
          question:      `ל${actor.name} היו ${a} ${obj}. ${pronoun} ${subVerb} ${b} ${obj}, ואז ${addVerb} עוד ${c}. כמה ${obj} יש ${possessive}?`,
          correct,
          signature:     sig === correct ? null : sig,
          signatureCode: sig === correct ? null : 'ERR_NUMBER_GRAB',
          distractors:   [wrongSign, noAdd, correct + 5, correct - 5].filter(x => x > 0 && x !== correct && x !== sig),
          cpaLayer:      'abstract',
          difficulty:    difficultyFor(a, b, c),
          rng:           () => 0.5,
        });
      }
    }
  }
}

function* enumerateNeutral(): Generator<PracticeItem> {
  let n = 7; // offset so neutral scenarios use a different slice of the grid
  for (let si = 0; si < NEUTRAL_SCENARIOS.length; si++) {
    const sc = NEUTRAL_SCENARIOS[si];
    for (let k = 0; k < 8; k++) {
      const [a, b, c] = W2_TUPLES[n % W2_TUPLES.length];
      n += 3;
      if (a - b + c <= 0) continue;
      const correct = a - b + c;
      const sig     = a + b + c;
      const wrongSign = a + b - c;
      const noAdd     = a - b - c;

      yield buildItem({
        itemId:        `G_W2_NEUTRAL_${si}_${a}_${b}_${c}`,
        skillCode:     SKILL,
        question:      `${sc.subjectStart} ${a} ${sc.object}. ${sc.subVerb} ${b}, ואחר כך ${sc.addVerb} ${c}. כמה ${sc.object} יש עכשיו?`,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_NUMBER_GRAB',
        distractors:   [wrongSign, noAdd, correct + 5, correct - 5].filter(x => x > 0 && x !== correct && x !== sig),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(a, b, c),
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = [...enumerateNamed(), ...enumerateNeutral()];
  return pickFromCombos(combos, opts);
}
