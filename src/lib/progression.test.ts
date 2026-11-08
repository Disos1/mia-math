/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord, GapProfile } from '../types';
import { composeSession } from './sessionComposer';
import { curriculumFrontier, type ClassPosition } from './curriculum/classPosition';
import { applyAttemptToMastery, type AttemptLedger } from './masteryTracker';
import { SKILL_GRAPH } from './skillGraph';

const rows: Array<[string, string, number, number, string]> = [
  ['ARITH_MULT_6_9', 'בתהליך', 0.72, 28, '2024-10-30T12:00'], ['ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.62, 26, '2024-10-23T12:00'],
  ['ARITH_WORD_2STEP', 'בתהליך', 0.72, 25, '2024-10-30T12:00'], ['ARITH_WORD_3STEP', 'בתהליך', 0.62, 29, '2024-10-24T12:00'],
  ['DATA_DIAGRAMS', 'בתהליך', 1, 29, '2024-10-26T12:00'], ['DIV_TENS_BY_DIGIT', 'בתהליך', 0.66, 29, '2024-10-30T12:00'],
  ['FRAC_COMPARE_UNIT', 'שליטה', 0.92, 30, '2024-11-02T08:00'], ['FRAC_OF_QUANTITY', 'בתהליך', 0.52, 30, '2024-11-02T12:00'],
  ['GEOM_PARALLEL_PERP', 'שליטה', 0.92, 24, '2024-11-02T09:00'], ['GEOM_POLYGONS', 'שליטה', 1, 30, '2024-11-02T10:00'],
  ['GEOM_RECT_SQUARE', 'בתהליך', 0.62, 25, '2024-10-30T12:00'], ['MULT_BY_10_100_1000', 'שליטה', 1, 29, '2024-11-02T11:00'],
  ['MULT_BY_TENS', 'בתהליך', 0.72, 26, '2024-11-01T12:00'], ['NUM_COMPARE', 'בתהליך', 0.72, 28, '2024-10-30T12:00'],
  ['NUM_ORDER_LINE', 'בתהליך', 0.42, 29, '2024-11-02T12:00'], ['NUM_READ_WRITE', 'בתהליך', 0.52, 25, '2024-10-30T12:00'],
  ['PLACE_VALUE_TO_MILLION', 'שליטה', 0.92, 29, '2024-11-02T12:00'],
];
const SYNTHETIC_LEARNER: MasteryMap = Object.fromEntries(rows.map(([s, st, a, n, d]) => [s, {
  profileId: 'p', skillCode: s, status: st, firstAttemptAccuracy: a, itemCount: n, sessionCount: 4,
  lastPracticedAt: `${d}:00.000Z`, needsRetentionProbe: false, retentionProbeDueAt: null,
} as MasteryRecord]));
const NOW = '2024-11-03T15:00:00.000Z';

const POS: ClassPosition = { units: {
  numbers: 'numbers.order_line', multdiv: 'multdiv.div_by_tens',
  geometry: 'geometry.parallel', fractions: 'not_started' }, source: {} };
const GAP = { version: 1, computedAt: 'x', diagnosticSessionId: 'x', strands: {}, cpaStartLayer: {},
  sessionComposerNotes: { startWith: 'easy_known_skill', firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO', blockedPracticePriority: [] } } as unknown as GapProfile;
const sessions = [40, 41, 42].map(k => composeSession({ profileId: 'p', gapProfile: GAP, masteryMap: SYNTHETIC_LEARNER, mode: 'quantity',
  sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4, classPosition: POS }));
const strandOf = (skill: string) => SKILL_GRAPH[skill]?.strand;

describe('she keeps moving forward', () => {
  it('keeps up with the class in every book, or runs ahead of it', () => {

    const f = curriculumFrontier(POS, SYNTHETIC_LEARNER);
    for (const t of f.targets) expect(t.aheadBy, t.strand).toBeGreaterThanOrEqual(0);
    expect(f.targets.find(x => x.strand === 'multdiv')).toMatchObject({ skill: 'DIV_BY_TENS', aheadBy: 0 });
    expect(f.targets.find(x => x.strand === 'numbers')).toMatchObject({ skill: 'NUM_ORDER_LINE', aheadBy: 0 });
    expect(f.targets.find(x => x.strand === 'geometry')).toMatchObject({ skill: 'GEOM_RECT_SQUARE', aheadBy: 1 });
  });

  it('repairs the mult/div topics behind the class within the week', () => {
    const week = [40, 41, 42, 43, 44, 45].map(k => composeSession({ profileId: 'p', gapProfile: GAP, masteryMap: SYNTHETIC_LEARNER, mode: 'quantity',
      sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4, classPosition: POS }));
    const repaired = new Set(week.flatMap(s => s.plannedItems)
      .filter(p => p.sessionPhase === 'blocked_practice').map(p => p.item.skillCode));
    expect(repaired).toContain('MULT_BY_TENS');
    expect(repaired).toContain('DIV_TENS_BY_DIGIT');
  });

  it('keeps a topic she has started open when a prerequisite dips', () => {

    const early: ClassPosition = { ...POS, units: { ...POS.units, multdiv: 'multdiv.times_10' } };
    expect(curriculumFrontier(early, SYNTHETIC_LEARNER).targets.find(x => x.strand === 'multdiv')?.skill).toBe('MULT_BY_TENS');
  });

  it('moves every book forward across three sessions', () => {
    const books = ['DIV_BY_TENS', 'NUM_ORDER_LINE', 'GEOM_RECT_SQUARE'];
    for (const b of books) {
      const n = sessions.filter(s => s.plannedItems.some(p => p.sessionPhase === 'new_material' && p.item.skillCode === b)).length;
      expect(n, b).toBe(2);
    }
    void strandOf;
  });

  it('spends at least half of each session on new material and repair, not review', () => {
    for (const s of sessions) {
      const working = s.plannedItems.filter(p => p.sessionPhase === 'new_material' || p.sessionPhase === 'blocked_practice').length;
      expect(working / s.plannedItems.length).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('does not "space" a skill she practised in the last three days', () => {
    for (const s of sessions) {
      for (const p of s.plannedItems.filter(x => x.sessionPhase === 'spaced_retrieval' && !x.isRetentionProbe)) {
        const last = Date.parse(SYNTHETIC_LEARNER[p.item.skillCode]?.lastPracticedAt ?? '1970-01-01');
        expect(Date.parse(NOW) - last, p.item.skillCode).toBeGreaterThanOrEqual(3 * 24 * 3600 * 1000);
      }
    }
  });
});

describe('mastery is lost below 70%, not at 79%', () => {
  const ledgerOf = (correct: number): AttemptLedger => ({
    ARITH_MULT_6_9: Array.from({ length: 10 }, (_, i) => ({ c: i < correct, l: 'abstract' as const, d: '2024-10-30' })),
  });
  const mastered = { ARITH_MULT_6_9: { ...SYNTHETIC_LEARNER.ARITH_MULT_6_9, status: 'שליטה' as const, firstAttemptAccuracy: 0.8 } };
  const answer = (correct: boolean, ledger: AttemptLedger) => applyAttemptToMastery({
    profileId: 'p', masteryMap: mastered, ledger, isNewSessionForSkill: false,
    attempt: { skillCode: 'ARITH_MULT_6_9', correct, firstAttempt: true, cpaLayer: 'abstract', createdAt: NOW } as never,
  }).masteryMap.ARITH_MULT_6_9.status;

  it('keeps mastery at 7 of 10', () => expect(answer(false, ledgerOf(8))).toBe('שליטה'));
  it('drops it at 6 of 10', () => expect(answer(false, ledgerOf(7))).toBe('בתהליך'));
});

describe('estimates do not advance a learner without mastery or confirmation', () => {

  const done = (s: string, a = 0.9) => ({ ...SYNTHETIC_LEARNER[s], skillCode: s, status: 'שליטה', firstAttemptAccuracy: a, itemCount: 30 } as MasteryRecord);
  const ADVANCED_FIXTURE: MasteryMap = { ...SYNTHETIC_LEARNER,
    NUM_ORDER_LINE: done('NUM_ORDER_LINE'), GEOM_RECT_SQUARE: done('GEOM_RECT_SQUARE'),
    MULT_BY_TENS: done('MULT_BY_TENS', 0.8), ARITH_MULT_6_9: done('ARITH_MULT_6_9', 0.8),
    DIV_BY_TENS: { ...SYNTHETIC_LEARNER.MULT_BY_TENS, skillCode: 'DIV_BY_TENS', firstAttemptAccuracy: 0.7, itemCount: 24 } as MasteryRecord,
  };

  const est: ClassPosition = {
    units:     { numbers: 'numbers.rounding', multdiv: 'multdiv.mult_div_link', geometry: 'geometry.rect_square', fractions: 'not_started' },
    source:    { numbers: 'estimate', multdiv: 'estimate', geometry: 'estimate' },
    confirmed: { numbers: 'numbers.order_line', multdiv: 'multdiv.div_by_tens', geometry: 'geometry.parallel' },
  };
  const f = curriculumFrontier(est, ADVANCED_FIXTURE);
  const at = (s: string) => f.targets.find(t => t.strand === s)?.skill;

  it('stays on division by whole tens until she has it', () => expect(at('multdiv')).toBe('DIV_BY_TENS'));
  it('moves on in the books where she has mastered the topic', () => {
    expect(at('numbers')).toBe('NUM_ROUNDING');
    expect(at('geometry')).toBe('GEOM_TRIANGLES');
  });
});
