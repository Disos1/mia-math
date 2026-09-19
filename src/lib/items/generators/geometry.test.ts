/**
 * Parallel / perpendicular — the answer is computed from coordinates, so these
 * tests check the questions are fair to a child, not just arithmetically true.
 */

import { describe, it, expect } from 'vitest';
import { generateParallelPerp, NO_SUCH_SIDE, isParallel, isPerpendicular, sideName } from './geometry';

const all = generateParallelPerp({ count: 10_000, rng: () => 0.5, recentIds: new Set() } as never);
const sideQs = all.filter(it => /איזו צלע (מקבילה|מאונכת)/.test(it.question));

describe('GEOM_PARALLEL_PERP side questions', () => {
  it('always offer "no such side" — the answer of a child who thinks tilted shapes have none', () => {
    expect(sideQs.length).toBeGreaterThan(0);
    for (const it of sideQs) expect(it.options, it.itemId).toContain(NO_SUCH_SIDE);
  });

  it('never leave her a coin flip', () => {
    for (const it of sideQs) expect(new Set(it.options).size, it.itemId).toBeGreaterThanOrEqual(3);
  });

  it('say "none" only when it is true', () => {
    for (const it of sideQs.filter(i => i.correct === NO_SUCH_SIDE)) {
      const v = it.visual as { points: [number, number][]; labels: string[]; highlightSides: number[] };
      const ref = v.highlightSides[0];
      const test = it.question.includes('מקבילה') ? isParallel : isPerpendicular;
      for (let j = 0; j < v.points.length; j++) {
        if (j === ref) continue;
        expect(test(v.points, ref, j), `${it.itemId}: ${sideName(v.labels, j)}`).toBe(false);
      }
    }
  });

  it('keep "none" rare enough that it is never a strategy', () => {
    const none = sideQs.filter(i => i.correct === NO_SUCH_SIDE).length;
    expect(none).toBeGreaterThan(0);
    expect(none / sideQs.length).toBeLessThan(0.2);
  });
});
