/**
 * Dual-track composition.
 *
 * The bug this exists to prevent: on 2026-07-31 a grade-4 skill was built,
 * registered, and completely unreachable — the composer drew only from the
 * (static, grade-3) diagnostic profile and the mastery map, so nothing could
 * ever schedule it. Content that cannot reach the child is not content.
 */

import { describe, it, expect } from 'vitest';
import { composeSession, CURRENT_GRADE_SHARE_INITIAL, CURRENT_GRADE_SHARE_SECURE } from './sessionComposer';
import type { MasteryMap, MasteryRecord, GapProfile, SessionPlanItem } from '../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function rec(skill: string, status: MasteryRecord['status'], acc?: number): MasteryRecord {
  return {
    profileId: 'p', skillCode: skill, status,
    firstAttemptAccuracy: acc ?? (status === 'שליטה' ? 0.9 : 0.6),
    itemCount: 50, sessionCount: 10,
    lastPracticedAt: '2026-07-31T00:00:00.000Z',
    needsRetentionProbe: false, retentionProbeDueAt: null,
  };
}

function mapOf(entries: Array<[string, MasteryRecord['status'], number?]>): MasteryMap {
  return Object.fromEntries(entries.map(([s, st, a]) => [s, rec(s, st, a)]));
}

/** Mia's real state, 2026-07-31. */
const MIA_NOW = mapOf([
  ['ARITH_MULT_6_9', 'שליטה'], ['ARITH_SUB_REGROUP_ZERO', 'שליטה'],
  ['ARITH_WORD_2STEP', 'שליטה'], ['FRAC_COMPARE_UNIT', 'שליטה'],
  ['FRAC_OF_QUANTITY', 'שליטה'],
  ['ARITH_WORD_3STEP', 'בתהליך'], ['MEAS_UNIT_CONVERT_CM', 'בתהליך'],
]);

/** Her real gap profile — from the July 9 diagnostic, now stale. */
const MIA_GAP = {
  version: 1, computedAt: '2026-07-09T15:29:59.860Z', diagnosticSessionId: 'x',
  strands: { ARITH: { status: 'בתהליך', priority: 1, activeErrors: [] } },
  cpaStartLayer: {},
  sessionComposerNotes: {
    startWith: 'easy_known_skill',
    firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO',
    blockedPracticePriority: ['ARITH_SUB_REGROUP_ZERO', 'ARITH_WORD_2STEP'],
  },
} as unknown as GapProfile;

const base = {
  profileId: 'p', gapProfile: MIA_GAP, masteryMap: MIA_NOW,
  mode: 'quantity' as const, sessionsCompleted: 55,
  rng: () => 0.5, now: '2026-07-31T10:00:00.000Z',
};

const skillsIn  = (items: SessionPlanItem[]) => [...new Set(items.map(i => i.item.skillCode))];
const working   = (items: SessionPlanItem[]) =>
  items.filter(i => i.sessionPhase === 'new_material' || i.sessionPhase === 'blocked_practice');

// ─── The regression ───────────────────────────────────────────────────────────

describe('reachability of grade-4 content', () => {
  it('never schedules grade-4 work at targetGrade 3 (unchanged legacy behaviour)', () => {
    const plan = composeSession({ ...base, targetGrade: 3 });
    expect(skillsIn(plan.plannedItems)).not.toContain('PLACE_VALUE_TO_MILLION');
  });

  it('schedules grade-4 place value once targetGrade is 4', () => {
    // The exact failure: before dual-track this returned only grade-3 skills.
    const plan = composeSession({ ...base, targetGrade: 4 });
    expect(skillsIn(plan.plannedItems)).toContain('PLACE_VALUE_TO_MILLION');
  });

  it('puts current-grade work in the new-material slot', () => {
    const plan = composeSession({ ...base, targetGrade: 4 });
    const newMat = plan.plannedItems.filter(i => i.sessionPhase === 'new_material');
    expect(newMat.length).toBeGreaterThan(0);
    expect(newMat.every(i => i.track === 'current_grade')).toBe(true);
  });

  it('never offers a skill that has no generator', () => {
    // FRAC_EQUIVALENT is declared in the graph and unlocked for her, but has no
    // generator yet. Selecting it would silently empty the block.
    const plan = composeSession({ ...base, targetGrade: 4 });
    expect(skillsIn(plan.plannedItems)).not.toContain('FRAC_EQUIVALENT');
    expect(plan.plannedItems.length).toBeGreaterThan(10);
  });
});

// ─── The mix ──────────────────────────────────────────────────────────────────

describe('current-grade / prerequisite mix', () => {
  it('keeps a real prerequisite stream rather than going all-in on grade 4', () => {
    const plan = composeSession({ ...base, targetGrade: 4 });
    const work = working(plan.plannedItems);
    const current = work.filter(i => i.track === 'current_grade').length;
    const prereq  = work.filter(i => i.track === 'prerequisite').length;

    expect(current).toBeGreaterThan(0);
    expect(prereq).toBeGreaterThan(0);
    // Current-grade should dominate but not monopolise.
    expect(current / work.length).toBeGreaterThan(0.4);
    expect(current / work.length).toBeLessThan(0.95);
  });

  it('honours an explicit share override', () => {
    const plan = composeSession({ ...base, targetGrade: 4, currentGradeShare: 0.5 });
    const work = working(plan.plannedItems);
    const current = work.filter(i => i.track === 'current_grade').length;
    expect(Math.abs(current / work.length - 0.5)).toBeLessThan(0.25);
  });

  it('shifts toward current grade once prerequisites are secure', () => {
    // Same child, but every blocking prerequisite is now comfortably strong.
    const secure = mapOf([
      ['ARITH_MULT_6_9', 'שליטה', 0.95], ['ARITH_SUB_REGROUP_ZERO', 'שליטה', 0.95],
      ['ARITH_WORD_2STEP', 'שליטה', 0.95], ['FRAC_COMPARE_UNIT', 'שליטה', 0.95],
      ['FRAC_OF_QUANTITY', 'שליטה', 0.95],
      ['ARITH_WORD_3STEP', 'בתהליך', 0.95], ['MEAS_UNIT_CONVERT_CM', 'בתהליך', 0.95],
    ]);
    const shaky  = composeSession({ ...base, targetGrade: 4 });
    const strong = composeSession({ ...base, masteryMap: secure, targetGrade: 4 });

    const share = (p: typeof shaky) => {
      const w = working(p.plannedItems);
      return w.filter(i => i.track === 'current_grade').length / w.length;
    };
    expect(share(strong)).toBeGreaterThanOrEqual(share(shaky));
    expect(CURRENT_GRADE_SHARE_SECURE).toBeGreaterThan(CURRENT_GRADE_SHARE_INITIAL);
  });

  it('runs an all-repair session when nothing at grade level is unlocked yet', () => {
    // A child whose foundations are all open should not be handed grade-4 work.
    const early = mapOf([
      ['ARITH_SUB_REGROUP_ZERO', 'בתהליך'], ['ARITH_MULT_6_9', 'בתהליך'],
      ['FRAC_COMPARE_UNIT', 'בתהליך'],
    ]);
    const plan = composeSession({ ...base, masteryMap: early, targetGrade: 4 });
    // PLACE_VALUE has no prerequisites, so it stays available even here — that
    // is deliberate: it is the foundation node. Nothing gated should appear.
    expect(skillsIn(plan.plannedItems)).not.toContain('ARITH_MULT_VERTICAL');
    expect(skillsIn(plan.plannedItems)).not.toContain('ARITH_DIV_LONG');
  });
});

// ─── Framing ──────────────────────────────────────────────────────────────────

describe('tools-for-today framing', () => {
  it('carries a Hebrew reason on prerequisite items that block a grade-4 skill', () => {
    // Slow multiplication facts block vertical multiplication, so facts become
    // prerequisite work — and must arrive explained, not as demotion.
    const withPlaceValue: MasteryMap = {
      ...MIA_NOW,
      PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה'),
    };
    const plan = composeSession({
      ...base, masteryMap: withPlaceValue, targetGrade: 4,
      slowSkills: new Set(['ARITH_MULT_6_9']),
    });
    const explained = plan.plannedItems.filter(i => i.track === 'prerequisite' && i.prereqWhy);
    expect(explained.length).toBeGreaterThan(0);
    for (const i of explained) {
      expect(i.prereqWhy).toMatch(/[֐-׿]/);       // Hebrew
      expect(i.prereqFor).toBeTruthy();            // names what it unlocks
    }
  });

  it('routes slow facts into the prerequisite stream for long multiplication', () => {
    const withPlaceValue: MasteryMap = {
      ...MIA_NOW,
      PLACE_VALUE_TO_MILLION: rec('PLACE_VALUE_TO_MILLION', 'שליטה'),
    };
    const plan = composeSession({
      ...base, masteryMap: withPlaceValue, targetGrade: 4,
      slowSkills: new Set(['ARITH_MULT_6_9']),
    });
    const prereqSkills = plan.plannedItems
      .filter(i => i.track === 'prerequisite').map(i => i.item.skillCode);
    expect(prereqSkills).toContain('ARITH_MULT_6_9');
  });
});

// ─── Non-regression ───────────────────────────────────────────────────────────

describe('does not regress grade-3 sessions', () => {
  it('fills the session to target in both modes', () => {
    for (const grade of [3, 4] as const) {
      const plan = composeSession({ ...base, targetGrade: grade });
      expect(plan.plannedItems.length, `grade ${grade}`).toBeGreaterThan(15);
    }
  });

  it('never repeats an item within a session', () => {
    const plan = composeSession({ ...base, targetGrade: 4 });
    const ids = plan.plannedItems.map(i => i.item.itemId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('still records its reasoning for the parent dashboard', () => {
    const plan = composeSession({ ...base, targetGrade: 4 });
    expect(plan.composerReasoning.some(r => r.includes('Dual-track'))).toBe(true);
  });
});
