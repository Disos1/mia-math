/**
 * "Mia practised for a few days in a row, but it seems those are still the same
 * topics" (Dima, 2026-11-03). Pinned against her real state that day.
 */
import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord, GapProfile } from '../types';
import { composeSession } from './sessionComposer';
import { curriculumFrontier, extrapolateUnit, type ClassPosition } from './curriculum/classPosition';
import { applyAttemptToMastery, type AttemptLedger } from './masteryTracker';
import { SKILL_GRAPH } from './skillGraph';

const rows: Array<[string, string, number, number, string]> = [
  ['ARITH_MULT_6_9', 'בתהליך', 0.7, 956, '2026-10-30T12:00'], ['ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.6, 814, '2026-10-23T12:00'],
  ['ARITH_WORD_2STEP', 'בתהליך', 0.7, 428, '2026-10-30T12:00'], ['ARITH_WORD_3STEP', 'בתהליך', 0.6, 397, '2026-10-24T12:00'],
  ['DATA_DIAGRAMS', 'בתהליך', 1, 5, '2026-10-26T12:00'], ['DIV_TENS_BY_DIGIT', 'בתהליך', 0.67, 12, '2026-10-30T12:00'],
  ['FRAC_COMPARE_UNIT', 'שליטה', 0.9, 62, '2026-11-02T08:00'], ['FRAC_OF_QUANTITY', 'בתהליך', 0.5, 342, '2026-11-02T12:00'],
  ['GEOM_PARALLEL_PERP', 'שליטה', 0.9, 35, '2026-11-02T09:00'], ['GEOM_POLYGONS', 'שליטה', 1, 13, '2026-11-02T10:00'],
  ['GEOM_RECT_SQUARE', 'בתהליך', 0.6, 8, '2026-10-30T12:00'], ['MULT_BY_10_100_1000', 'שליטה', 1, 26, '2026-11-02T11:00'],
  ['MULT_BY_TENS', 'בתהליך', 0.7, 37, '2026-11-01T12:00'], ['NUM_COMPARE', 'בתהליך', 0.7, 18, '2026-10-30T12:00'],
  ['NUM_ORDER_LINE', 'בתהליך', 0.4, 19, '2026-11-02T12:00'], ['NUM_READ_WRITE', 'בתהליך', 0.5, 15, '2026-10-30T12:00'],
  ['PLACE_VALUE_TO_MILLION', 'שליטה', 0.9, 68, '2026-11-02T12:00'],
];
const MIA: MasteryMap = Object.fromEntries(rows.map(([s, st, a, n, d]) => [s, {
  profileId: 'p', skillCode: s, status: st, firstAttemptAccuracy: a, itemCount: n, sessionCount: 10,
  lastPracticedAt: `${d}:00.000Z`, needsRetentionProbe: false, retentionProbeDueAt: null,
} as MasteryRecord]));
const NOW = '2026-11-03T15:00:00.000Z', SET = '2026-10-21T18:21:20.801Z';
const POS: ClassPosition = { units: {
  numbers: extrapolateUnit('numbers', 'numbers.compare', SET, NOW).id,
  multdiv: extrapolateUnit('multdiv', 'multdiv.div_by_tens', SET, NOW).id,
  geometry: extrapolateUnit('geometry', 'geometry.parallel', SET, NOW).id, fractions: 'not_started' }, source: {} };
const GAP = { version: 1, computedAt: 'x', diagnosticSessionId: 'x', strands: {}, cpaStartLayer: {},
  sessionComposerNotes: { startWith: 'easy_known_skill', firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO', blockedPracticePriority: [] } } as unknown as GapProfile;
const sessions = [40, 41, 42].map(k => composeSession({ profileId: 'p', gapProfile: GAP, masteryMap: MIA, mode: 'quantity',
  sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4, classPosition: POS }));
const strandOf = (skill: string) => SKILL_GRAPH[skill]?.strand;

describe('she keeps moving forward', () => {
  it('keeps a topic she has started open when a prerequisite dips', () => {
    // The 6–9 tables slipped to 70%; multiplication by whole tens (37 answers in)
    // must not lock, or the whole mult/div book stops.
    const t = curriculumFrontier(POS, MIA).targets.find(x => x.strand === 'multdiv');
    expect(t?.skill).toBe('MULT_BY_TENS');
  });

  it('moves every book forward across three sessions', () => {
    const books = ['MULT_BY_TENS', 'NUM_ORDER_LINE', 'GEOM_RECT_SQUARE'];
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
        const last = Date.parse(MIA[p.item.skillCode]?.lastPracticedAt ?? '1970-01-01');
        expect(Date.parse(NOW) - last, p.item.skillCode).toBeGreaterThanOrEqual(3 * 24 * 3600 * 1000);
      }
    }
  });
});

describe('mastery is lost below 70%, not at 79%', () => {
  const ledgerOf = (correct: number): AttemptLedger => ({
    ARITH_MULT_6_9: Array.from({ length: 10 }, (_, i) => ({ c: i < correct, l: 'abstract' as const, d: '2026-10-30' })),
  });
  const mastered = { ARITH_MULT_6_9: { ...MIA.ARITH_MULT_6_9, status: 'שליטה' as const, firstAttemptAccuracy: 0.8 } };
  const answer = (correct: boolean, ledger: AttemptLedger) => applyAttemptToMastery({
    profileId: 'p', masteryMap: mastered, ledger, isNewSessionForSkill: false,
    attempt: { skillCode: 'ARITH_MULT_6_9', correct, firstAttempt: true, cpaLayer: 'abstract', createdAt: NOW } as never,
  }).masteryMap.ARITH_MULT_6_9.status;

  it('keeps mastery at 7 of 10', () => expect(answer(false, ledgerOf(8))).toBe('שליטה'));
  it('drops it at 6 of 10', () => expect(answer(false, ledgerOf(7))).toBe('בתהליך'));
});
