/**
 * A skill must have enough DIFFERENT questions to practise for months.
 *
 * Dima, 2026-09-20: "why did you again create a bank of questions instead of a
 * generator?" He was right. Question text, answers, distractors and worked steps
 * were always computed — but for half the skills the PARAMETERS were a
 * hand-written list, which caps the pool. Long division could produce 20
 * questions. Add/subtract to a million: 32.
 *
 * The arithmetic that sets the floor: an actively practised skill gets about
 * 5 questions a session, 4 sessions a week — 20 a week. 120 distinct questions
 * is then about six weeks before she meets a repeat, and repeats after that are
 * spaced practice rather than the same twelve questions on a loop.
 *
 * Some skills are genuinely finite: there are only so many 6–9 times-table
 * facts, and only so many shapes whose lines of symmetry a fourth-grader names.
 * Those are listed below WITH their reason. Everything else sweeps.
 */

import { describe, it, expect } from 'vitest';
import { SKILLS_WITH_PRACTICE, getItemPool } from './index';

/** Six weeks of active practice without meeting the same question twice. */
const MIN_POOL = 120;

/** Skills the subject matter itself bounds — floor, and why it is smaller. */
const BOUNDED: Record<string, { floor: number; why: string }> = {
  ARITH_MULT_6_9: {
    floor: 40,
    why: 'the 6–9 fact family is finite: 4 × 9 facts, plus their variants',
  },
  GEOM_SYMMETRY: {
    floor: 40,
    why: 'lines of symmetry are a named-shape fact; regular polygons 3–12 plus the quadrilaterals is the whole grade-4 set',
  },
};

describe('every skill can be practised for months without looping', () => {
  const pools = SKILLS_WITH_PRACTICE.map(skill => ({
    skill,
    size: getItemPool(skill, { count: 100_000, recentIds: new Set(), seed: `pool-${skill}` }).length,
  }));

  it('produces enough distinct questions per skill', () => {
    const thin = pools
      .filter(p => p.size < (BOUNDED[p.skill]?.floor ?? MIN_POOL))
      .map(p => `${p.skill}: ${p.size} (floor ${BOUNDED[p.skill]?.floor ?? MIN_POOL})`);
    expect(thin, `thin pools:\n${thin.join('\n')}`).toEqual([]);
  });

  it('keeps every pool small enough to enumerate cheaply each session', () => {
    // The composer enumerates a skill's whole combo set, shuffles and takes a
    // slice. Unbounded sweeps would make that the slowest thing in the app.
    for (const p of pools) expect(p.size, p.skill).toBeLessThan(20_000);
  });

  it('documents why a bounded skill is bounded', () => {
    for (const [skill, b] of Object.entries(BOUNDED)) {
      expect(SKILLS_WITH_PRACTICE, `${skill} is in the allowlist but not registered`).toContain(skill);
      expect(b.why.length, skill).toBeGreaterThan(20);
    }
  });
});
