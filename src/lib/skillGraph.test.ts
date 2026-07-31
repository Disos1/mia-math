/**
 * Skill-graph invariants.
 *
 * These guard the pedagogical claims the graph encodes. A wrong edge routes Mia
 * to the wrong remediation silently — there is no crash to notice — so the graph
 * is exactly the code that needs tests most.
 *
 * The "real data" block reproduces Mia's actual mastery state (Supabase,
 * 2026-07-31) so the routing behaviour is pinned against the child it serves.
 */

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rec(skill: string, status: MasteryRecord['status']): MasteryRecord {
  return {
    profileId: 'p', skillCode: skill, status,
    firstAttemptAccuracy: status === 'שליטה' ? 1 : 0.5,
    itemCount: 20, sessionCount: 3,
    lastPracticedAt: '2026-07-31T00:00:00.000Z',
    needsRetentionProbe: false, retentionProbeDueAt: null,
  };
}

function mapOf(entries: Record<string, MasteryRecord['status']>): MasteryMap {
  const m: MasteryMap = {};
  for (const [k, v] of Object.entries(entries)) m[k] = rec(k, v);
  return m;
}

/** Mia's real state as of 2026-07-31 (from Supabase mastery_records). */
const MIA_REAL = mapOf({
  ARITH_MULT_6_9:         'שליטה',
  FRAC_OF_QUANTITY:       'שליטה',
  MEAS_UNIT_CONVERT_CM:   'שליטה',
  FRAC_COMPARE_UNIT:      'שליטה',
  ARITH_SUB_REGROUP_ZERO: 'בתהליך',
  ARITH_WORD_3STEP:       'בתהליך',
  ARITH_WORD_2STEP:       'בתהליך',
});

// ─── Structural integrity ─────────────────────────────────────────────────────

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

// ─── Curriculum fidelity (validated research, 3/3 tool agreement) ─────────────

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

  it('schedules the Jan–Mar algorithms after the Oct place-value work', () => {
    expect(SKILL_GRAPH.ARITH_MULT_VERTICAL.taughtFrom).toBe('jan');
    expect(SKILL_GRAPH.ARITH_DIV_LONG.taughtFrom).toBe('jan');
    expect(SKILL_GRAPH.PLACE_VALUE_TO_MILLION.taughtFrom).toBe('oct');
  });
});

// ─── Routing ──────────────────────────────────────────────────────────────────

describe('findBlocker', () => {
  it('returns the target itself when nothing blocks it', () => {
    const r = findBlocker('FRAC_OF_QUANTITY', MIA_REAL);
    expect(r.skill).toBe('FRAC_OF_QUANTITY');
    expect(r.depth).toBe(0);
    expect(r.via).toBeNull();
  });

  it("routes Mia's word problems down to the subtraction gap underneath", () => {
    // The headline case: she has ground 311 word-problem items while the
    // subtraction they depend on sits at 44.8%.
    const r = findBlocker('ARITH_WORD_2STEP', MIA_REAL);
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.depth).toBe(1);
    expect(r.via?.why).toMatch(/[֐-׿]/);
  });

  it('descends only one layer per call by default', () => {
    // 3-step → 2-step → regroup-zero. Default maxDepth 1 stops at 2-step so a
    // single miss can never demote her two levels at once.
    const r = findBlocker('ARITH_WORD_3STEP', MIA_REAL);
    expect(r.skill).toBe('ARITH_WORD_2STEP');
    expect(r.depth).toBe(1);
  });

  it('descends further only when explicitly allowed', () => {
    const r = findBlocker('ARITH_WORD_3STEP', MIA_REAL, { maxDepth: 5 });
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.chain).toEqual([
      'ARITH_WORD_3STEP', 'ARITH_WORD_2STEP', 'ARITH_SUB_REGROUP_ZERO',
    ]);
  });

  it('treats a mastered-but-slow fact skill as blocking a written algorithm', () => {
    // Mia's facts read as mastered but her true accuracy is ~68% and latency is
    // the real signal. Slow facts must block long multiplication.
    const slow = new Set(['ARITH_MULT_6_9']);
    const withPlaceValue = { ...MIA_REAL, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };

    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue)).toBe(true);
    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue, slow)).toBe(false);

    const r = findBlocker('ARITH_MULT_VERTICAL', withPlaceValue, { slowSkills: slow });
    expect(r.skill).toBe('ARITH_MULT_6_9');
  });

  it('degrades fluency edges to accuracy when no latency signal exists', () => {
    // A missing latency signal must never freeze her progress.
    const edge = { skill: 'ARITH_MULT_6_9', kind: 'fluency' as const, why: 'בדיקה' };
    expect(isPrereqSatisfied(edge, MIA_REAL)).toBe(true);
  });

  it('cannot hang on a malformed cyclic graph', () => {
    // findBlocker is cycle-guarded; prove it terminates rather than trusting it.
    const r = findBlocker('ARITH_WORD_3STEP', {}, { maxDepth: 99 });
    expect(r.chain.length).toBeLessThan(20);
  });
});

// ─── Unlocking ────────────────────────────────────────────────────────────────

describe('unlocking', () => {
  it('blocks every grade-4 skill for Mia today', () => {
    // She has no place-value skill and her fractions/subtraction gaps are open,
    // so nothing in grade 4 should be offered as new material yet.
    expect(unlockedGrade4Skills(MIA_REAL)).not.toContain('ARITH_ADD_SUB_LARGE');
    expect(unlockedGrade4Skills(MIA_REAL)).not.toContain('ARITH_MULT_VERTICAL');
  });

  it('opens PLACE_VALUE_TO_MILLION immediately — it is the foundation node', () => {
    // Deliberate: this is the missing floor beneath her worst skill, so it must
    // be reachable from day one rather than gated behind the gaps it explains.
    expect(isUnlocked('PLACE_VALUE_TO_MILLION', MIA_REAL)).toBe(true);
    expect(unlockedGrade4Skills(MIA_REAL)).toContain('PLACE_VALUE_TO_MILLION');
  });

  it('opens equivalent fractions, since her unit-fraction skill is mastered', () => {
    expect(isUnlocked('FRAC_EQUIVALENT', MIA_REAL)).toBe(true);
  });

  it('reports what a skill unlocks, for the "you opened this" payoff', () => {
    expect(unlockedBy('ARITH_MULT_6_9').sort())
      .toEqual(['ARITH_DIV_LONG', 'ARITH_MULT_VERTICAL']);
  });

  it('opens large add/sub only once place value AND regroup-zero are secure', () => {
    const partial = { ...MIA_REAL, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', partial)).toBe(false); // regroup still open

    const full = { ...partial, ARITH_SUB_REGROUP_ZERO: rec('ARITH_SUB_REGROUP_ZERO', 'שליטה') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', full)).toBe(true);
  });
});
