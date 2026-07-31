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

/**
 * Mia's CURRENT state (Supabase mastery_records, 2026-07-31).
 *
 * She cleared subtraction-across-zero and 2-step word problems under the
 * honest-mastery rules: 89.5% first-attempt at the ABSTRACT layer over 4
 * separate days. Measurement conversion was demoted by a retention probe.
 */
const MIA_NOW = mapOf({
  ARITH_MULT_6_9:         'שליטה',
  ARITH_SUB_REGROUP_ZERO: 'שליטה',
  ARITH_WORD_2STEP:       'שליטה',
  FRAC_COMPARE_UNIT:      'שליטה',
  FRAC_OF_QUANTITY:       'שליטה',
  ARITH_WORD_3STEP:       'בתהליך',
  MEAS_UNIT_CONVERT_CM:   'בתהליך',
});

/**
 * Her state three weeks earlier, kept deliberately as a regression fixture.
 *
 * This is the case the graph exists for — a child grinding word problems while
 * the subtraction beneath them is broken. It must keep working even though she
 * has since climbed out of it, because the next skill she stalls on will look
 * exactly like this.
 */
const MIA_JULY_10 = mapOf({
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
    const r = findBlocker('FRAC_OF_QUANTITY', MIA_NOW);
    expect(r.skill).toBe('FRAC_OF_QUANTITY');
    expect(r.depth).toBe(0);
    expect(r.via).toBeNull();
  });

  it('routes a word-problem miss down to a broken subtraction foundation', () => {
    // The case the graph exists for, pinned against her real July-10 state:
    // she had ground hundreds of word-problem items while the subtraction they
    // depend on was still open.
    const r = findBlocker('ARITH_WORD_2STEP', MIA_JULY_10);
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.depth).toBe(1);
    expect(r.via?.why).toMatch(/[֐-׿]/);
  });

  it('stops routing down once she has actually mastered the foundation', () => {
    // She cleared regroup-zero on 2026-07-31 (89.5% first-attempt, abstract).
    // The graph must now leave 2-step word problems alone rather than dragging
    // her back to subtraction she has demonstrably learned.
    const r = findBlocker('ARITH_WORD_2STEP', MIA_NOW);
    expect(r.skill).toBe('ARITH_WORD_2STEP');
    expect(r.depth).toBe(0);
  });

  it('descends only one layer per call by default', () => {
    // 3-step → 2-step → regroup-zero. Default maxDepth 1 stops at 2-step so a
    // single miss can never demote her two levels at once.
    const r = findBlocker('ARITH_WORD_3STEP', MIA_JULY_10);
    expect(r.skill).toBe('ARITH_WORD_2STEP');
    expect(r.depth).toBe(1);
  });

  it('descends further only when explicitly allowed', () => {
    const r = findBlocker('ARITH_WORD_3STEP', MIA_JULY_10, { maxDepth: 5 });
    expect(r.skill).toBe('ARITH_SUB_REGROUP_ZERO');
    expect(r.chain).toEqual([
      'ARITH_WORD_3STEP', 'ARITH_WORD_2STEP', 'ARITH_SUB_REGROUP_ZERO',
    ]);
  });

  it('leaves her current weak skill as its own target — nothing beneath it is broken', () => {
    // ARITH_WORD_3STEP is her one remaining בתהליך arithmetic skill (60%).
    // Its prerequisite (2-step) is now mastered, so the work is the skill
    // itself, not a hidden foundation.
    const r = findBlocker('ARITH_WORD_3STEP', MIA_NOW);
    expect(r.skill).toBe('ARITH_WORD_3STEP');
    expect(r.depth).toBe(0);
  });

  it('treats a mastered-but-slow fact skill as blocking a written algorithm', () => {
    // Measured 2026-07-31: her first-attempt-correct multiplication facts average
    // 18.2s versus 3.1s for unit-fraction comparison on the same keypad. Accuracy
    // says "mastered"; latency says she is computing, not retrieving — and that
    // is what collapses inside long multiplication.
    const slow = new Set(['ARITH_MULT_6_9']);
    const withPlaceValue = { ...MIA_NOW, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };

    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue)).toBe(true);
    expect(isUnlocked('ARITH_MULT_VERTICAL', withPlaceValue, slow)).toBe(false);

    const r = findBlocker('ARITH_MULT_VERTICAL', withPlaceValue, { slowSkills: slow });
    expect(r.skill).toBe('ARITH_MULT_6_9');
  });

  it('degrades fluency edges to accuracy when no latency signal exists', () => {
    // A missing latency signal must never freeze her progress.
    const edge = { skill: 'ARITH_MULT_6_9', kind: 'fluency' as const, why: 'בדיקה' };
    expect(isPrereqSatisfied(edge, MIA_NOW)).toBe(true);
  });

  it('cannot hang on a malformed cyclic graph', () => {
    // findBlocker is cycle-guarded; prove it terminates rather than trusting it.
    const r = findBlocker('ARITH_WORD_3STEP', {}, { maxDepth: 99 });
    expect(r.chain.length).toBeLessThan(20);
  });

  it('re-opens a skill that a retention probe demoted', () => {
    // MEAS_UNIT_CONVERT_CM was demoted שליטה → בתהליך by a probe on 2026-07-31.
    // Anything depending on it must route back to it rather than assuming the
    // earlier mastery still holds.
    const r = findBlocker('MEAS_UNIT_CONVERT_M', MIA_NOW);
    expect(r.skill).toBe('MEAS_UNIT_CONVERT_CM');
    expect(r.depth).toBe(1);
  });
});

// ─── Unlocking ────────────────────────────────────────────────────────────────

describe('unlocking', () => {
  it('still blocks the written algorithms — place value is not built yet', () => {
    // Vertical multiplication and long division are January–March content and
    // depend on PLACE_VALUE_TO_MILLION, which has no generator yet.
    expect(unlockedGrade4Skills(MIA_NOW)).not.toContain('ARITH_MULT_VERTICAL');
    expect(unlockedGrade4Skills(MIA_NOW)).not.toContain('ARITH_DIV_LONG');
  });

  it('opens PLACE_VALUE_TO_MILLION immediately — it is the foundation node', () => {
    // Deliberate: this is the October classroom topic and the floor beneath the
    // arithmetic skills, so it must be reachable rather than gated behind them.
    expect(isUnlocked('PLACE_VALUE_TO_MILLION', MIA_NOW)).toBe(true);
    expect(unlockedGrade4Skills(MIA_NOW)).toContain('PLACE_VALUE_TO_MILLION');
  });

  it('opens equivalent fractions, since her unit-fraction skill is mastered', () => {
    expect(isUnlocked('FRAC_EQUIVALENT', MIA_NOW)).toBe(true);
  });

  it('reports what a skill unlocks, for the "you opened this" payoff', () => {
    expect(unlockedBy('ARITH_MULT_6_9').sort())
      .toEqual(['ARITH_DIV_LONG', 'ARITH_MULT_VERTICAL']);
  });

  it('now needs only place value to open large add/sub — she cleared regroup-zero', () => {
    // Before 2026-07-31 this needed two things. Her mastery of regroup-zero
    // means place value is the single remaining gate.
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', MIA_NOW)).toBe(false);

    const withPlaceValue = { ...MIA_NOW, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', withPlaceValue)).toBe(true);
  });

  it('would re-close large add/sub if regroup-zero were demoted by a probe', () => {
    // Honest mastery is reversible; the gate must reverse with it.
    const withPlaceValue = { ...MIA_NOW, PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה') };
    const demoted = { ...withPlaceValue, ARITH_SUB_REGROUP_ZERO: rec('ARITH_SUB_REGROUP_ZERO', 'בתהליך') };
    expect(isUnlocked('ARITH_ADD_SUB_LARGE', demoted)).toBe(false);
  });
});
