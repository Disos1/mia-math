/**
 * Keypad capacity.
 *
 * On 2026-07-31 Mia was asked to write 200,030 and the pad stopped accepting
 * digits after "2000" — it was pinned at 4, a value that was correct for
 * grade-3 answers and silently wrong the moment grade-4 content arrived.
 *
 * The pad width is now derived from the expected answer, and this file checks
 * that derivation against EVERY item every generator can produce. A future
 * skill with bigger numbers cannot reintroduce an unanswerable item.
 */

import { describe, it, expect } from 'vitest';
import { digitsNeededFor } from './NumPad';
import { SKILLS_WITH_PRACTICE, getItemPool } from '../../lib/items';
import { makeRng, hashString } from '../../lib/items/rng';

/** How many digits a learner must be able to type to enter this value. */
function digitsIn(v: string | number): number {
  return String(v).replace(/[^0-9]/g, '').length;
}

describe('digitsNeededFor', () => {
  it('never drops below the grade-3 floor', () => {
    expect(digitsNeededFor(7)).toBe(4);
    expect(digitsNeededFor(42)).toBe(4);
    expect(digitsNeededFor(undefined)).toBe(4);
  });

  it('fits the six-digit answer that broke live', () => {
    expect(digitsNeededFor(200030)).toBeGreaterThanOrEqual(digitsIn(200030));
  });

  it('leaves one digit of headroom so an over-long wrong answer is enterable', () => {
    // Some misconceptions produce a LONGER numeral than the answer (too many
    // zeros in a million). She must be able to type it in order to be diagnosed.
    expect(digitsNeededFor(200030)).toBe(7);
    expect(digitsNeededFor(1000000)).toBe(8);
  });

  it('ignores separators when counting', () => {
    expect(digitsNeededFor('200,030')).toBe(7);
  });
});

describe('every generated item is actually enterable', () => {
  const pools = SKILLS_WITH_PRACTICE.map(skill => ({
    skill,
    items: getItemPool(skill, {
      count: 5000, recentIds: new Set(), rng: makeRng(hashString(`pad-${skill}`)),
    }),
  }));

  it('covers every registered skill', () => {
    expect(pools.length).toBeGreaterThan(5);
    for (const p of pools) expect(p.items.length, p.skill).toBeGreaterThan(0);
  });

  it('lets the learner type the correct answer for every keypad item', () => {
    for (const { skill, items } of pools) {
      for (const item of items) {
        if (item.answerMode !== 'keypad') continue;
        const cap = digitsNeededFor(item.correct);
        expect(
          digitsIn(item.correct),
          `${skill} / ${item.itemId}: needs ${digitsIn(item.correct)} digits, pad allows ${cap} — "${item.question}"`,
        ).toBeLessThanOrEqual(cap);
      }
    }
  });

  it('lets the learner type every step-ladder answer', () => {
    // The ladder is the recovery path after a miss. A pad too small there traps
    // her in the very flow designed to rescue her.
    for (const { skill, items } of pools) {
      for (const item of items) {
        for (const step of item.steps ?? []) {
          if (step.answer === undefined) continue;
          const cap = digitsNeededFor(step.answer);
          expect(
            digitsIn(step.answer),
            `${skill} / ${item.itemId}: ladder step needs ${digitsIn(step.answer)} digits, pad allows ${cap}`,
          ).toBeLessThanOrEqual(cap);
        }
      }
    }
  });

  it('lets the learner type the misconception answer, so it can be diagnosed', () => {
    // If the signature is longer than the pad allows, the engine can never
    // observe that misconception — the diagnosis silently becomes impossible.
    for (const { skill, items } of pools) {
      for (const item of items) {
        if (item.answerMode !== 'keypad' || item.signature === null) continue;
        const cap = digitsNeededFor(item.correct);
        expect(
          digitsIn(item.signature!),
          `${skill} / ${item.itemId}: signature ${item.signature} needs more digits than the pad allows`,
        ).toBeLessThanOrEqual(cap);
      }
    }
  });
});
