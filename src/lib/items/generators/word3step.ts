/**
 * ARITH_WORD_3STEP — three-step word problems on 4 numbers.
 *
 * Operation chains are mixed: −,+,−  /  +,−,+  /  +,+,−  / −,+,+.
 * Signature distractor: a + b + c + d (ERR_NUMBER_GRAB).
 */

import type { PracticeItem } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { NAMES, OBJECTS, NEUTRAL_SCENARIOS } from '../wordBank';

const SKILL = 'ARITH_WORD_3STEP';

type OpChain = [-1 | 1, -1 | 1, -1 | 1];

const CHAINS: OpChain[] = [
  [-1, +1, -1],
  [+1, -1, +1],
  [+1, +1, -1],
  [-1, +1, +1],
];

function chainText(chain: OpChain, actorGender: 'f' | 'm'): { v1: string; v2: string; v3: string } {
  const subF = ['נתנה', 'איבדה', 'מכרה'];
  const subM = ['נתן',  'איבד',  'מכר' ];
  const addF = ['קנתה', 'קיבלה', 'מצאה'];
  const addM = ['קנה',  'קיבל',  'מצא' ];
  const f = chain.map((s, i) => (s === -1 ? subF[i] : addF[i]));
  const m = chain.map((s, i) => (s === -1 ? subM[i] : addM[i]));
  const arr = actorGender === 'f' ? f : m;
  return { v1: arr[0], v2: arr[1], v3: arr[2] };
}

function chainTextNeutral(chain: OpChain): { v1: string; v2: string; v3: string } {
  const sub = ['ניתנו', 'אבדו', 'נמכרו'];
  const add = ['נקנו', 'התקבלו', 'נמצאו'];
  return {
    v1: chain[0] === -1 ? sub[0] : add[0],
    v2: chain[1] === -1 ? sub[1] : add[1],
    v3: chain[2] === -1 ? sub[2] : add[2],
  };
}

function evalChain(a: number, b: number, c: number, d: number, chain: OpChain): number {
  return a + chain[0] * b + chain[1] * c + chain[2] * d;
}

function difficultyFor(a: number): number {
  return a <= 30 ? 3 : a <= 50 ? 3 : 4;
}

/**
 * Wide grid of (a, b, c, d) tuples — a ∈ 26..98, with three (b, c, d) shapes
 * per a → ~80 distinct number combinations (vs. the old 8). `a` is kept large
 * enough that the result stays positive across all four operation chains.
 */
function numberTuples(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let a = 26; a <= 98; a += 3) {
    const variants: [number, number, number][] = [
      [4 + (a % 9),  5 + (a % 7),  3 + (a % 5)],
      [6 + (a % 11), 4 + (a % 6),  5 + (a % 8)],
      [3 + (a % 7),  7 + (a % 9),  4 + (a % 6)],
    ];
    for (const [b, c, d] of variants) {
      // Keep positive under the most-subtractive chain (a − b − c is the worst case here)
      if (a - b - c - d > 0 || a - Math.max(b, c, d) > 0) out.push([a, b, c, d]);
    }
  }
  return out;
}

const W3_TUPLES = numberTuples();

function* enumerateNamed(): Generator<PracticeItem> {
  let n = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const actor = NAMES[i];
    const pronoun = actor.gender === 'f' ? 'היא' : 'הוא';
    const possessive = actor.gender === 'f' ? 'לה' : 'לו';

    for (let oi = 0; oi < OBJECTS.length; oi += 3) {
      const obj   = OBJECTS[oi];
      const chain = CHAINS[(i + oi) % CHAINS.length];
      const verbs = chainText(chain, actor.gender);
      const [a, b, c, d] = W3_TUPLES[n % W3_TUPLES.length];
      n++;
      const correct = evalChain(a, b, c, d, chain);
      if (correct <= 0) continue;
      const sig = a + b + c + d;

      yield buildItem({
        itemId:        `G_W3_NAMED_${actor.name}_${obj}_${a}_${b}_${c}_${d}_${chain.join('')}`,
        skillCode:     SKILL,
        question:      `ל${actor.name} היו ${a} ${obj}. ${pronoun} ${verbs.v1} ${b}, ${verbs.v2} ${c} ואחר כך ${verbs.v3} ${d}. כמה ${obj} יש ${possessive}?`,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_NUMBER_GRAB',
        distractors:   [
          a + b - c - d,
          a - b - c + d,
          correct + 7,
          correct - 7,
        ].filter(x => x > 0 && x !== correct && x !== sig),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(a),
        rng:           () => 0.5,
      });
    }
  }
}

function* enumerateNeutral(): Generator<PracticeItem> {
  let n = 5; // offset into the grid so neutral scenarios use different numbers
  for (let si = 0; si < NEUTRAL_SCENARIOS.length; si++) {
    const sc = NEUTRAL_SCENARIOS[si];
    for (let ci = 0; ci < CHAINS.length; ci++) {
      const chain = CHAINS[ci];
      const verbs = chainTextNeutral(chain);
      const [a, b, c, d] = W3_TUPLES[n % W3_TUPLES.length];
      n += 2;
      const correct = evalChain(a, b, c, d, chain);
      if (correct <= 0) continue;
      const sig = a + b + c + d;

      yield buildItem({
        itemId:        `G_W3_NEUTRAL_${si}_${a}_${b}_${c}_${d}_${chain.join('')}`,
        skillCode:     SKILL,
        question:      `${sc.subjectStart} ${a} ${sc.object}. ${verbs.v1} ${b}, ${verbs.v2} ${c} ואחר כך ${verbs.v3} ${d}. כמה ${sc.object} יש?`,
        correct,
        signature:     sig === correct ? null : sig,
        signatureCode: sig === correct ? null : 'ERR_NUMBER_GRAB',
        distractors:   [
          a + b - c - d,
          a - b - c + d,
          correct + 7,
          correct - 7,
        ].filter(x => x > 0 && x !== correct && x !== sig),
        cpaLayer:      'abstract',
        difficulty:    difficultyFor(a),
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = [...enumerateNamed(), ...enumerateNeutral()];
  return pickFromCombos(combos, opts);
}
