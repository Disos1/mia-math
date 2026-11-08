/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import { SKILLS_WITH_PRACTICE, getItemPool } from './index';

const MIN_POOL = 120;

const BOUNDED: Record<string, { floor: number; why: string }> = {
  ARITH_MULT_6_9: {
    floor: 40,
    why: 'the 6–9 fact family is finite: 4 × 9 facts, plus their variants',
  },
  GEOM_BOX_DIAGONALS: {
    floor: 20,
    why: 'every box has 12 face diagonals and 4 through the box; the topic varies what she must see (faces, a vertex, which segments), not the numbers',
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

    for (const p of pools) expect(p.size, p.skill).toBeLessThan(20_000);
  });

  it('documents why a bounded skill is bounded', () => {
    for (const [skill, b] of Object.entries(BOUNDED)) {
      expect(SKILLS_WITH_PRACTICE, `${skill} is in the allowlist but not registered`).toContain(skill);
      expect(b.why.length, skill).toBeGreaterThan(20);
    }
  });
});
