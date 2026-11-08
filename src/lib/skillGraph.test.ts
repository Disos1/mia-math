/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord } from '../types';
import {
  SKILL_GRAPH,
  prerequisitesOf,
  unlockedBy,
  gradeOf,
  findBlocker,
  isUnlocked,
  unlockedGrade4Skills,
  isPrereqSatisfied,
} from './skillGraph';

function rec(skill: string, status: MasteryRecord['status']): MasteryRecord {
  return {
    profileId: 'p', skillCode: skill, status,
    firstAttemptAccuracy: status === 'שליטה' ? 1 : 0.5,
    itemCount: 20, sessionCount: 3,
    lastPracticedAt: '2024-07-31T00:00:00.000Z',
    needsRetentionProbe: false, retentionProbeDueAt: null,
  };
}

function mapOf(entries: Record<string, MasteryRecord['status']>): MasteryMap {
  const m: MasteryMap = {};
  for (const [k, v] of Object.entries(entries)) m[k] = rec(k, v);
  return m;
}

const FOUNDATION_READY = mapOf({
  ARITH_MULT_6_9:         'שליטה',
  ARITH_SUB_REGROUP_ZERO: 'שליטה',
  ARITH_WORD_2STEP:       'שליטה',
  FRAC_COMPARE_UNIT:      'שליטה',
  FRAC_OF_QUANTITY:       'שליטה',
  ARITH_WORD_3STEP:       'בתהליך',
  MEAS_UNIT_CONVERT_CM:   'בתהליך',
});

const FOUNDATION_GAP = mapOf({
  ARITH_MULT_6_9:         'שליטה',
  FRAC_OF_QUANTITY:       'שליטה',
  MEAS_UNIT_CONVERT_CM:   'שליטה',
  FRAC_COMPARE_UNIT:      'שליטה',
  ARITH_SUB_REGROUP_ZERO: 'בתהליך',
  ARITH_WORD_3STEP:       'בתהליך',
  ARITH_WORD_2STEP:       'בתהליך',
});

describe('graph structure', () => {
  it('every prerequisite points at a declared node', () => {
    for (const node of Object.values(SKILL_GRAPH)) {
      for (const p of node.prereqs) {
        expect(SKILL_GRAPH[p.skill], `${node.skill} → ${p.skill}`).toBeDefined();
      }
    }
  });

  it('node keys match their skill field', () => {
    for (const [key, node] of Object.entries(SKILL_GRAPH)) {
      expect(node.skill).toBe(key);
    }
  });

  it('has no cycles', () => {
    const state = new Map<string, 'visiting' | 'done'>();
    const walk = (s: string, path: string[]): void => {
      if (state.get(s) === 'done') return;
      expect(state.get(s), `cycle: ${[...path, s].join(' → ')}`).not.toBe('visiting');
      state.set(s, 'visiting');
      for (const p of prerequisitesOf(s)) walk(p.skill, [...path, s]);
      state.set(s, 'done');
    };
    for (const s of Object.keys(SKILL_GRAPH)) walk(s, []);
  });

  it('never lets a grade-4 skill be a prerequisite of a grade-3 skill', () => {
    for (const node of Object.values(SKILL_GRAPH)) {
      if (node.grade !== 3) continue;
      for (const p of node.prereqs) {
        expect(gradeOf(p.skill), `${node.skill} ← ${p.skill}`).toBe(3);
      }
    }
  });

  it('gives every edge a Hebrew explanation for the tools-for-today framing', () => {
    for (const node of Object.values(SKILL_GRAPH)) {
      for (const p of node.prereqs) {
        expect(p.why.length, `${node.skill} → ${p.skill}`).toBeGreaterThan(10);
        expect(p.why, `${node.skill} → ${p.skill}`).toMatch(/[֐-׿]/);
      }
    }
  });
});

describe('curriculum fidelity', () => {
  it('contains no decimal or average skills — both are grade 5', () => {
    for (const s of Object.keys(SKILL_GRAPH)) {
      expect(s).not.toMatch(/DECIMAL|AVERAGE|MEAN/i);
    }
  });

  it('gates written algorithms on FLUENT fact recall, not mere accuracy', () => {
    for (const algo of ['ARITH_MULT_VERTICAL', 'ARITH_DIV_LONG']) {
      const factEdge = prerequisitesOf(algo).find(p => p.skill === 'ARITH_MULT_6_9');
      expect(factEdge, `${algo} must depend on facts`).toBeDefined();
      expect(factEdge!.kind, `${algo} fact edge must be fluency`).toBe('fluency');
    }
  });

  it('matches the timing in her textbook, not the generic research', () => {

    expect(SKILL_GRAPH.PLACE_VALUE_TO_MILLION.taughtFrom).toBe('sept');
    expect(SKILL_GRAPH.FRAC_EQUIVALENT.taughtFrom).toBe('jan');
    expect(SKILL_GRAPH.ARITH_MULT_VERTICAL.taughtFrom).toBe('jan');
    expect(SKILL_GRAPH.ARITH_DIV_LONG.taughtFrom).toBe('jan');
  });
});

describe('findBlocker', () => {
  it('returns the target itself when nothing blocks it', () => {
    const r = findBlocker('FRAC_OF_QUANTITY', FOUNDATION_READY);
    expect(r.skill).toBe('FRAC_OF_QUANTITY');
    expect(r.depth).toBe(0);
    expect(r.via).toBeNull();
  });

  it('routes a word-problem miss down to a broken subtraction foundation', () => {

    const r = findBlocker('ARITH_WORD_2STEP', FOUNDATION_GAP);
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.depth).toBe(1);
    expect(r.via?.why).toMatch(/[֐-׿]/);
  });

  it('stops routing down once she has actually mastered the foundation', () => {

    const r = findBlocker('ARITH_WORD_2STEP', FOUNDATION_READY);
    expect(r.skill).toBe('ARITH_WORD_2STEP');
    expect(r.depth).toBe(0);
  });

  it('descends only one layer per call by default', () => {

    const r = findBlocker('ARITH_WORD_3STEP', FOUNDATION_GAP);
    expect(r.skill).toBe('ARITH_WORD_2STEP');
    expect(r.depth).toBe(1);
  });

  it('descends further only when explicitly allowed', () => {
    const r = findBlocker('ARITH_WORD_3STEP', FOUNDATION_GAP, { maxDepth: 5 });
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.chain).toEqual([
      'ARITH_WORD_3STEP', 'ARITH_WORD_2STEP', 'ARITH_SUB_REGROUP_ZERO',
    ]);
  });

  it('leaves her current weak skill as its own target — nothing beneath it is broken', () => {

    const r = findBlocker('ARITH_WORD_3STEP', FOUNDATION_READY);
    expect(r.skill).toBe('ARITH_WORD_3STEP');
    expect(r.depth).toBe(0);
  });

  it('treats a mastered-but-slow fact skill as blocking a written algorithm', () => {

    const slow = new Set(['ARITH_MULT_6_9']);
    const withPlaceValue = { ...FOUNDATION_READY, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };

    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue)).toBe(true);
    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue, slow)).toBe(false);

    const r = findBlocker('ARITH_MULT_VERTICAL', withPlaceValue, { slowSkills: slow });
    expect(r.skill).toBe('ARITH_MULT_6_9');
  });

  it('degrades fluency edges to accuracy when no latency signal exists', () => {

    const edge = { skill: 'ARITH_MULT_6_9', kind: 'fluency' as const, why: 'בדיקה' };
    expect(isPrereqSatisfied(edge, FOUNDATION_READY)).toBe(true);
  });

  it('cannot hang on a malformed cyclic graph', () => {

    const r = findBlocker('ARITH_WORD_3STEP', {}, { maxDepth: 99 });
    expect(r.chain.length).toBeLessThan(20);
  });

  it('re-opens a skill that a retention probe demoted', () => {

    const r = findBlocker('MEAS_UNIT_CONVERT_M', FOUNDATION_READY);
    expect(r.skill).toBe('MEAS_UNIT_CONVERT_CM');
    expect(r.depth).toBe(1);
  });
});

describe('unlocking', () => {
  it('still blocks the written algorithms — place value is not built yet', () => {

    expect(unlockedGrade4Skills(FOUNDATION_READY)).not.toContain('ARITH_MULT_VERTICAL');
    expect(unlockedGrade4Skills(FOUNDATION_READY)).not.toContain('ARITH_DIV_LONG');
  });

  it('opens PLACE_VALUE_TO_MILLION immediately — it is the foundation node', () => {

    expect(isUnlocked('PLACE_VALUE_TO_MILLION', FOUNDATION_READY)).toBe(true);
    expect(unlockedGrade4Skills(FOUNDATION_READY)).toContain('PLACE_VALUE_TO_MILLION');
  });

  it('opens equivalent fractions, since her unit-fraction skill is mastered', () => {
    expect(isUnlocked('FRAC_EQUIVALENT', FOUNDATION_READY)).toBe(true);
  });

  it('reports what a skill unlocks, for the "you opened this" payoff', () => {

    expect(unlockedBy('ARITH_MULT_6_9').sort())
      .toEqual(['ARITH_DIV_LONG', 'ARITH_MULT_VERTICAL', 'DIV_ONE_DIGIT', 'DIV_TENS_BY_DIGIT',
                'GEOM_AREA', 'MULT_BY_TENS', 'MULT_DIV_LINK', 'NUM_POWERS']);
  });

  it('now needs only place value to open large add/sub — she cleared regroup-zero', () => {

    expect(isUnlocked('ARITH_ADD_SUB_LARGE', FOUNDATION_READY)).toBe(false);

    const withPlaceValue = { ...FOUNDATION_READY, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', withPlaceValue)).toBe(true);
  });

  it('would re-close large add/sub if regroup-zero were demoted by a probe', () => {

    const withPlaceValue = { ...FOUNDATION_READY, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };
    const demoted = { ...withPlaceValue, ARITH_SUB_REGROUP_ZERO: rec('ARITH_SUB_REGROUP_ZERO', 'בתהליך') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', demoted)).toBe(false);
  });
});
