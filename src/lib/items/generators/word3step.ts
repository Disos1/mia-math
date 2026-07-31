/**
 * ARITH_WORD_3STEP — three-step word problems on 4 numbers.
 *
 * Operation chains are mixed: −,+,−  /  +,−,+  /  +,+,−  / −,+,+.
 * Signature distractor: a + b + c + d (ERR_NUMBER_GRAB).
 */

import type { PracticeItem, WorkedStep } from '../../../types';
import { buildItem, pickFromCombos, type GenerateOpts } from '../shared';
import { NAMES, OBJECTS, NEUTRAL_SCENARIOS, subVerbsFor, addVerbsFor } from '../wordBank';
import type { ObjectKind } from '../wordBank';

const SKILL = 'ARITH_WORD_3STEP';

type OpChain = [-1 | 1, -1 | 1, -1 | 1];

const CHAINS: OpChain[] = [
  [-1, +1, -1],
  [+1, -1, +1],
  [+1, +1, -1],
  [-1, +1, +1],
];

/**
 * Verbs for a named actor, filtered to those that make sense for the object.
 * Drawing from the full verb list regardless of object is what produced
 * "he ate 32 books"; the kind filter makes that unrepresentable.
 */
function chainText(
  chain: OpChain, actorGender: 'f' | 'm', kind: ObjectKind,
): { v1: string; v2: string; v3: string } {
  const subs = subVerbsFor(kind);
  const adds = addVerbsFor(kind);
  const pick = (i: number, sign: number) => {
    const pool = sign === -1 ? subs : adds;
    const v    = pool[i % pool.length];
    return actorGender === 'f' ? v.f : v.m;
  };
  const arr = chain.map((s, i) => pick(i, s));
  return { v1: arr[0], v2: arr[1], v3: arr[2] };
}

/**
 * Verbs for a neutral scenario, taken from the SCENARIO ITSELF.
 *
 * This function previously returned a hardcoded נמכרו/נקנו list for every
 * scenario, which generated "בכיתה יש 40 ילדים. נמכרו 12, נקנו 5" — children
 * being sold and bought. The scenarios always carried correct verbs; nothing
 * used them. Now they are the only source.
 */
function chainTextNeutral(
  chain: OpChain, sc: { subVerbs: string[]; addVerbs: string[] },
): { v1: string; v2: string; v3: string } {
  const pick = (i: number, sign: number) => {
    const pool = sign === -1 ? sc.subVerbs : sc.addVerbs;
    return pool[i % pool.length];
  };
  const arr = chain.map((s, i) => pick(i, s));
  return { v1: arr[0], v2: arr[1], v3: arr[2] };
}

function evalChain(a: number, b: number, c: number, d: number, chain: OpChain): number {
  return a + chain[0] * b + chain[1] * c + chain[2] * d;
}

/** Chain decomposition: one keypad micro-step per event. */
function chainSteps(a: number, b: number, c: number, d: number, chain: OpChain): WorkedStep[] {
  const r1 = a + chain[0] * b;
  const r2 = r1 + chain[1] * c;
  const r3 = r2 + chain[2] * d;
  const op = (s: -1 | 1) => (s === -1 ? '−' : '+');
  return [
    { text: `שלב 1: כמה זה ${a} ${op(chain[0])} ${b}?`, answer: r1 },
    { text: `שלב 2: כמה זה ${r1} ${op(chain[1])} ${c}?`, answer: r2 },
    { text: `שלב 3: כמה זה ${r2} ${op(chain[2])} ${d}?`, answer: r3 },
  ];
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
      const entry = OBJECTS[oi];
      const obj   = entry.noun;
      const chain = CHAINS[(i + oi) % CHAINS.length];
      const verbs = chainText(chain, actor.gender, entry.kind);
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
        answerMode:    'keypad',
        steps:         chainSteps(a, b, c, d, chain),
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
      const verbs = chainTextNeutral(chain, sc);
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
        answerMode:    'keypad',
        steps:         chainSteps(a, b, c, d, chain),
        rng:           () => 0.5,
      });
    }
  }
}

export function generate(opts: GenerateOpts): PracticeItem[] {
  const combos = [...enumerateNamed(), ...enumerateNeutral()];
  return pickFromCombos(combos, opts);
}
