/**
 * PLACE_VALUE_TO_MILLION generator invariants.
 *
 * A generator bug is Mia-visible: a wrong "correct" answer marks her right
 * answer wrong. These tests check the mathematics of every emitted item rather
 * than trusting the templates.
 */

import { describe, it, expect } from 'vitest';
import { generate } from './placeValueMillion';
import { makeRng, hashString } from '../rng';

const ALL = generate({ count: 10_000, rng: makeRng(hashString('test')), recentIds: new Set() });

describe('place-value generator', () => {
  it('produces a usable pool', () => {
    expect(ALL.length).toBeGreaterThan(30);
  });

  it('gives every item a unique id', () => {
    expect(new Set(ALL.map(i => i.itemId)).size).toBe(ALL.length);
  });

  it('never emits a signature equal to the correct answer', () => {
    // A signature that equals the answer would mark a correct response as a
    // misconception hit — the worst possible failure for a diagnostic engine.
    for (const it of ALL) {
      if (it.signature !== null) expect(it.signature).not.toBe(it.correct);
    }
  });

  it('always includes the correct answer among the options', () => {
    for (const it of ALL) expect(it.options).toContain(it.correct);
  });

  it('stays inside the grade-4 curriculum range (≤ 1,000,000)', () => {
    for (const it of ALL) {
      if (typeof it.correct === 'number') {
        expect(it.correct).toBeGreaterThanOrEqual(0);
        expect(it.correct).toBeLessThanOrEqual(1_000_000);
      }
    }
  });

  it('tags every signature with a declared grade-4 error code', () => {
    const allowed = new Set([
      'ERR_DIGIT_FOR_VALUE', 'ERR_ZERO_PLACEHOLDER',
      'ERR_FIRST_DIGIT_CMP', 'ERR_PLACE_SHIFT',
    ]);
    for (const it of ALL) {
      if (it.signatureCode) expect(allowed.has(it.signatureCode)).toBe(true);
    }
  });

  it('never mentions decimals — that is grade-5 content', () => {
    for (const it of ALL) {
      expect(it.question).not.toMatch(/[0-9],[0-9]{1,2}\b|עשרוני|נקודה עשרונית/);
    }
  });
});

// ─── Per-template mathematics ─────────────────────────────────────────────────

describe('digit-value items', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_VAL_'));

  it('asks for the value and treats the bare digit as the misconception', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const parts = it.itemId.split('_');           // G_PV_VAL_<n>_<place>
      const n = Number(parts[3]), place = Number(parts[4]);
      const digit = Math.floor(n / 10 ** place) % 10;

      expect(it.correct).toBe(digit * 10 ** place);
      expect(it.signature).toBe(digit);          // the documented wrong answer
      expect(it.signatureCode).toBe('ERR_DIGIT_FOR_VALUE');
    }
  });

  it('never asks about a zero digit, where the value is not diagnostic', () => {
    for (const it of items) {
      const parts = it.itemId.split('_');           // G_PV_VAL_<n>_<place>
      const digit = Math.floor(Number(parts[3]) / 10 ** Number(parts[4])) % 10;
      expect(digit).not.toBe(0);
    }
  });
});

describe('comparison items', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_CMP_'));

  it('always makes the longer number the answer and the leading-digit pick the trap', () => {
    // The item is only diagnostic when the shorter number has the bigger first
    // digit — otherwise the faulty rule accidentally gives the right answer.
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const small = Number(it.itemId.split('_')[3]);
      const large = Number(it.itemId.split('_')[4]);
      expect(large).toBeGreaterThan(small);
      expect(String(large).length).toBeGreaterThan(String(small).length);
      expect(Number(String(small)[0])).toBeGreaterThan(Number(String(large)[0]));
      expect(it.correct).toBe(large);
      expect(it.signature).toBe(small);
    }
  });
});

describe('word-to-numeral items', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_WORD_'));

  it('models the dropped-zero error as removing zeros from the numeral', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const correct = Number(it.correct);
      const dropped = Number(it.signature);
      // The misconception writes the same digits with internal zeros removed.
      expect(String(correct).replace(/0/g, '')).toBe(String(dropped).replace(/0/g, ''));
      expect(dropped).toBeLessThan(correct);
      expect(it.signatureCode).toBe('ERR_ZERO_PLACEHOLDER');
    }
  });

  it('only uses numbers that actually contain an internal zero', () => {
    for (const it of items) {
      const digits = String(it.correct);
      expect(digits.slice(1, -1)).toMatch(/0/);
    }
  });
});

describe('expanded-form items', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_EXP_'));

  it('sums its own addends correctly', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const addends = (it.question.match(/[\d,]+/g) ?? [])
        .map(s => Number(s.replace(/,/g, '')));
      expect(addends.reduce((a, b) => a + b, 0)).toBe(it.correct);
    }
  });

  it('shifts exactly one component to produce the signature', () => {
    for (const it of items) {
      expect(it.signature).not.toBe(it.correct);
      expect(it.signatureCode).toBe('ERR_PLACE_SHIFT');
    }
  });
});

describe('regroup-unit items', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_RGP_'));

  it('divides the number by the requested unit', () => {
    expect(items.length).toBeGreaterThan(0);
    for (const it of items) {
      const parts = it.itemId.split('_');           // G_PV_RGP_<n>_<unit>
      expect(it.correct).toBe(Number(parts[3]) / Number(parts[4]));
    }
  });
});

describe('carry-chain probe', () => {
  const items = ALL.filter(i => i.itemId.startsWith('G_PV_CARRY_'));

  it('adds one correctly at each 9-boundary', () => {
    expect(items.length).toBe(4);
    for (const it of items) {
      const base = Number(it.itemId.split('_')[3]);
      expect(it.correct).toBe(base + 1);
    }
  });

  it('carries no fabricated signature', () => {
    // The research's 99,999+1 → 99,991 signature did not derive from its stated
    // rule, so this template deliberately asserts no misconception.
    for (const it of items) {
      expect(it.signature).toBeNull();
      expect(it.signatureCode).toBeNull();
    }
  });
});

// ─── Step ladders ─────────────────────────────────────────────────────────────

describe('step ladders', () => {
  it('ends every ladder on the correct answer', () => {
    // The ladder exists so she exits a miss by producing the right answer
    // herself. A ladder whose last numeric step disagrees with `correct` would
    // teach the wrong thing.
    for (const it of ALL) {
      if (!it.steps?.length) continue;
      const numeric = it.steps.filter(s => s.answer !== undefined);
      if (numeric.length === 0) continue;
      expect(numeric[numeric.length - 1].answer).toBe(it.correct);
    }
  });

  it('gives keypad items a ladder to fall back on', () => {
    for (const it of ALL.filter(i => i.answerMode === 'keypad')) {
      expect(it.steps?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
