/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import { digitsNeededFor } from './NumPad';
import { SKILLS_WITH_PRACTICE, getItemPool } from '../../lib/items';
import { makeRng, hashString } from '../../lib/items/rng';

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
