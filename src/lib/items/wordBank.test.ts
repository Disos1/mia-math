/**
 * Semantic safety of generated word problems.
 *
 * Mia read these sentences. Two live bugs on 2026-07-31:
 *   "לאורי היו 70 ספרים. הוא אכל 32 ספרים"      — ate 32 books
 *   "בכיתה יש 40 ילדים. נמכרו 12, נקנו 5"        — children sold and bought
 *
 * Both came from pairing verbs with objects by index arithmetic. These tests
 * scan every generated item, so a future template cannot reintroduce the class.
 */

import { describe, it, expect } from 'vitest';
import { generate as gen2 } from './generators/word2step';
import { generate as gen3 } from './generators/word3step';
import { makeRng, hashString } from './rng';
import { OBJECTS, NEUTRAL_SCENARIOS, subVerbsFor, addVerbsFor } from './wordBank';

const opts = { count: 10_000, rng: makeRng(hashString('semantics')), recentIds: new Set<string>() };
const ALL  = [...gen2(opts), ...gen3(opts)];

/**
 * Whole-word match. Hebrew verbs nest as substrings (נמכרו contains מכר, and
 * נתנה contains נתן), so naive `includes` produces false alarms.
 */
function hasWord(text: string, word: string): boolean {
  return new RegExp(`(^|\\s)${word}(\\s|,|\\.|$)`).test(text);
}

/** Verbs that may never be applied to people. */
const NEVER_FOR_PEOPLE = [
  'נמכרו', 'נקנו', 'מכר', 'מכרה', 'קנה', 'קנתה',
  'נאכלו', 'אכל', 'אכלה', 'אבדו', 'איבד', 'איבדה', 'נמצאו', 'מצא', 'מצאה',
];

/** Verbs that may only act on food. */
const EDIBLE_ONLY = ['אכל', 'אכלה', 'נאכלו'];

describe('generated word problems are semantically sane', () => {
  it('generates a real pool', () => {
    expect(ALL.length).toBeGreaterThan(50);
  });

  it('never eats a non-edible object', () => {
    const inedible = OBJECTS.filter(o => o.kind !== 'edible').map(o => o.noun);
    for (const it of ALL) {
      for (const verb of EDIBLE_ONLY) {
        if (!hasWord(it.question, verb)) continue;
        for (const noun of inedible) {
          expect(
            it.question.includes(noun),
            `"${verb}" applied to "${noun}" in: ${it.question}`,
          ).toBe(false);
        }
      }
    }
  });

  it('never buys, sells, loses or eats people', () => {
    const peopleScenarios = NEUTRAL_SCENARIOS.filter(s => s.object === 'ילדים');
    expect(peopleScenarios.length).toBeGreaterThan(0);

    for (const it of ALL) {
      if (!it.question.includes('ילדים')) continue;
      for (const verb of NEVER_FOR_PEOPLE) {
        expect(
          hasWord(it.question, verb),
          `"${verb}" applied to children in: ${it.question}`,
        ).toBe(false);
      }
    }
  });

  it('uses only verbs the scenario itself declares, for neutral problems', () => {
    for (const sc of NEUTRAL_SCENARIOS) {
      const own = new Set([...sc.subVerbs, ...sc.addVerbs]);
      const items = ALL.filter(i =>
        i.question.startsWith(sc.subjectStart) && i.question.includes(sc.object));
      for (const it of items) {
        // Every scenario verb appearing in the sentence must be one of its own.
        const foreign = [...NEVER_FOR_PEOPLE, 'ניתנו', 'התקבלו']
          .filter(v => hasWord(it.question, v) && !own.has(v));
        expect(foreign, `foreign verbs in: ${it.question}`).toEqual([]);
      }
    }
  });

  it('conjugates named-actor verbs to the actor gender', () => {
    // A feminine name with a masculine verb reads as broken Hebrew to a child.
    const femaleOnlyVerbs = ['נתנה', 'איבדה', 'מכרה', 'חילקה', 'אכלה', 'קנתה', 'קיבלה', 'מצאה'];
    const maleOnlyVerbs   = ['נתן', 'איבד', 'מכר', 'חילק', 'אכל', 'קנה', 'קיבל', 'מצא'];

    for (const it of ALL) {
      if (!it.question.includes('היא ') && !it.question.includes('הוא ')) continue;
      const isFemale = it.question.includes('היא ');
      const wrong = (isFemale ? maleOnlyVerbs : femaleOnlyVerbs)
        // masculine forms are prefixes of feminine ones (נתן ⊂ נתנה), so only
        // flag a masculine verb when it is not part of its feminine form
        .filter(v => hasWord(it.question, v));
      expect(wrong, `gender mismatch in: ${it.question}`).toEqual([]);
    }
  });
});

describe('word bank invariants', () => {
  it('gives every object at least one usable verb of each direction', () => {
    for (const o of OBJECTS) {
      expect(subVerbsFor(o.kind).length, o.noun).toBeGreaterThan(0);
      expect(addVerbsFor(o.kind).length, o.noun).toBeGreaterThan(0);
    }
  });

  it('gives every neutral scenario enough verbs for a three-step chain', () => {
    for (const s of NEUTRAL_SCENARIOS) {
      expect(s.subVerbs.length, s.object).toBeGreaterThanOrEqual(3);
      expect(s.addVerbs.length, s.object).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps people out of the possessions list entirely', () => {
    // "לאורי היו 70 ילדים" is never a sentence we want to generate.
    for (const o of OBJECTS) {
      expect(['ילדים', 'תלמידים', 'אנשים']).not.toContain(o.noun);
    }
  });
});
