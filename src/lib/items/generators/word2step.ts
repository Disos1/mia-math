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

function* enumerateNamed(): Generator<PracticeItem> {
  // Sample param triples — coarse step keeps the pool finite (~hundreds).
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

      // 3 (a, b, c) tuples per (actor, object) combination
      const tuples: [number, number, number][] = [
        [18, 7,  4],
        [30, 12, 5],
        [25, 9,  6],
        [40, 17, 10],
        [50, 22, 8],
        [36, 11, 7],
      ];
      // Deterministically pick a few to keep variety bounded
      const picks = [tuples[i % tuples.length], tuples[(i + 2) % tuples.length]];

      for (const [a, b, c] of picks) {
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
  for (let si = 0; si < NEUTRAL_SCENARIOS.length; si++) {
    const sc = NEUTRAL_SCENARIOS[si];
    const tuples: [number, number, number][] = [
      [24, 9,  6],
      [40, 17, 12],
      [28, 12, 5],
      [45, 18, 10],
      [32, 14, 8],
      [50, 23, 11],
    ];
    for (let ti = 0; ti < tuples.length; ti++) {
      const [a, b, c] = tuples[ti];
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
