/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import { composeSession, CURRENT_GRADE_SHARE_INITIAL, CURRENT_GRADE_SHARE_SECURE } from './sessionComposer';
import type { MasteryMap, MasteryRecord, GapProfile, SessionPlanItem } from '../types';

function rec(skill: string, status: MasteryRecord['status'], acc?: number): MasteryRecord {
  return {
    profileId: 'p', skillCode: skill, status,
    firstAttemptAccuracy: acc ?? (status === 'שליטה' ? 0.92 : 0.62),
    itemCount: 24, sessionCount: 4,
    lastPracticedAt: '2024-07-31T00:00:00.000Z',
    needsRetentionProbe: false, retentionProbeDueAt: null,
  };
}

function mapOf(entries: Array<[string, MasteryRecord['status'], number?]>): MasteryMap {
  return Object.fromEntries(entries.map(([s, st, a]) => [s, rec(s, st, a)]));
}

const FOUNDATION_READY = mapOf([
  ['ARITH_MULT_6_9', 'שליטה'], ['ARITH_SUB_REGROUP_ZERO', 'שליטה'],
  ['ARITH_WORD_2STEP', 'שליטה'], ['FRAC_COMPARE_UNIT', 'שליטה'],
  ['FRAC_OF_QUANTITY', 'שליטה'],
  ['ARITH_WORD_3STEP', 'בתהליך'], ['MEAS_UNIT_CONVERT_CM', 'בתהליך'],
]);

const SYNTHETIC_GAP = {
  version: 1, computedAt: '2024-07-09T08:00:00.000Z', diagnosticSessionId: 'x',
  strands: { ARITH: { status: 'בתהליך', priority: 1, activeErrors: [] } },
  cpaStartLayer: {},
  sessionComposerNotes: {
    startWith: 'easy_known_skill',
    firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO',
    blockedPracticePriority: ['ARITH_SUB_REGROUP_ZERO', 'ARITH_WORD_2STEP'],
  },
} as unknown as GapProfile;

const base = {
  profileId: 'p', gapProfile: SYNTHETIC_GAP, masteryMap: FOUNDATION_READY,
  mode: 'quantity' as const, sessionsCompleted: 28,
  rng: () => 0.5, now: '2024-07-31T10:00:00.000Z',
};

const skillsIn  = (items: SessionPlanItem[]) => [...new Set(items.map(i => i.item.skillCode))];
const working   = (items: SessionPlanItem[]) =>
  items.filter(i => i.sessionPhase === 'new_material' || i.sessionPhase === 'blocked_practice');

describe('reachability of grade-4 content', () => {
  it('never schedules grade-4 work at targetGrade 3 (unchanged legacy behaviour)', () => {
    const plan = composeSession({ ...base, targetGrade: 3 });
    expect(skillsIn(plan.plannedItems)).not.toContain('PLACE_VALUE_TO_MILLION');
  });

  it('schedules grade-4 place value once targetGrade is 4', () => {

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

    const plan = composeSession({ ...base, targetGrade: 4 });
    expect(skillsIn(plan.plannedItems)).not.toContain('FRAC_EQUIVALENT');
    expect(plan.plannedItems.length).toBeGreaterThan(10);
  });
});

describe('current-grade / prerequisite mix', () => {
  it('keeps a real prerequisite stream rather than going all-in on grade 4', () => {
    const plan = composeSession({ ...base, targetGrade: 4 });
    const work = working(plan.plannedItems);
    const current = work.filter(i => i.track === 'current_grade').length;
    const prereq  = work.filter(i => i.track === 'prerequisite').length;

    expect(current).toBeGreaterThan(0);
    expect(prereq).toBeGreaterThan(0);

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

    const early = mapOf([
      ['ARITH_SUB_REGROUP_ZERO', 'בתהליך'], ['ARITH_MULT_6_9', 'בתהליך'],
      ['FRAC_COMPARE_UNIT', 'בתהליך'],
    ]);
    const plan = composeSession({ ...base, masteryMap: early, targetGrade: 4 });

    expect(skillsIn(plan.plannedItems)).not.toContain('ARITH_MULT_VERTICAL');
    expect(skillsIn(plan.plannedItems)).not.toContain('ARITH_DIV_LONG');
  });
});

describe('tools-for-today framing', () => {
  it('carries a Hebrew reason on prerequisite items that block a grade-4 skill', () => {

    const withPlaceValue: MasteryMap = {
      ...FOUNDATION_READY,
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
      ...FOUNDATION_READY,
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
