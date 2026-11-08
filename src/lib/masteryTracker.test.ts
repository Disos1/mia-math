/** Synthetic regression scenarios only. Never copy learner records into tests. */
import { describe, it, expect } from 'vitest';
import type { PracticeAttempt, MasteryMap, MasteryRecord, CPALayer } from '../types';
import {
  applyAttemptToMastery, applyProbeResult, appendToLedger, windowAccuracy,
  mergeMasteryMaps,
} from './masteryTracker';
import type { AttemptLedger } from './masteryTracker';
import { RETENTION_DEMOTION_ACCURACY } from '../constants/config';

const SKILL = 'MEAS_UNIT_CONVERT_CM';

function attempt(
  correct: boolean, cpaLayer: CPALayer, day: string,
): PracticeAttempt {
  return {
    id: crypto.randomUUID(), profileId: 'p', sessionId: `s-${day}`,
    itemId: `i-${Math.random()}`, skillCode: SKILL,
    sessionPhase: 'spaced_retrieval', cpaLayer,
    answer: 1, correct, firstAttempt: true, signatureHit: null,
    timeToAnswerMs: 5000, sequenceNumber: 0,
    createdAt: `${day}T10:00:00.000Z`,
  };
}

function run(
  seq: Array<{ correct: boolean; layer: CPALayer; day: string }>,
  startStatus?: 'שליטה' | 'בתהליך',
): { masteryMap: MasteryMap; ledger: AttemptLedger } {
  let masteryMap: MasteryMap = {};
  let ledger: AttemptLedger = {};
  const seenDays = new Set<string>();

  if (startStatus) {
    masteryMap = { [SKILL]: {
      profileId: 'p', skillCode: SKILL, status: startStatus,
      firstAttemptAccuracy: 1, itemCount: 100, sessionCount: 40,
      lastPracticedAt: '2024-07-01T00:00:00.000Z',
      needsRetentionProbe: false, retentionProbeDueAt: null,
    } };
  }

  for (const s of seq) {
    const isNewSessionForSkill = !seenDays.has(s.day);
    seenDays.add(s.day);
    ({ masteryMap, ledger } = applyAttemptToMastery({
      profileId: 'p',
      attempt: attempt(s.correct, s.layer, s.day),
      masteryMap, ledger, isNewSessionForSkill,
    }));
  }
  return { masteryMap, ledger };
}

const abstractDay = (day: string, n: number, correct = true) =>
  Array.from({ length: n }, () => ({ correct, layer: 'abstract' as CPALayer, day }));

describe("unit-conversion retention regression", () => {

  function syntheticLedger(): AttemptLedger {
    let lg: AttemptLedger = {};
    for (const d of ['2024-07-13', '2024-07-22']) {
      for (let i = 0; i < 5; i++) lg = appendToLedger(lg, SKILL, { c: true, l: 'abstract', d });
    }
    return appendToLedger(lg, SKILL, { c: false, l: 'abstract', d: '2024-07-24' });
  }

  const mastered: MasteryMap = { [SKILL]: {
    profileId: 'p', skillCode: SKILL, status: 'שליטה',
    firstAttemptAccuracy: 0.9, itemCount: 24, sessionCount: 4,
    lastPracticedAt: '2024-07-24T10:00:00.000Z',
    needsRetentionProbe: true, retentionProbeDueAt: '2024-07-24T00:00:00.000Z',
  } };

  it('keeps mastery when one probe is missed but the window still supports it', () => {
    const acc = windowAccuracy(syntheticLedger(), SKILL);
    expect(acc).toBeGreaterThan(RETENTION_DEMOTION_ACCURACY);

    const after = applyProbeResult(mastered, SKILL, false, '2024-07-24T10:00:00.000Z', acc);
    expect(after[SKILL].status).toBe('שליטה');
  });

  it('re-probes soon rather than waiting the full schedule', () => {

    const after = applyProbeResult(
      mastered, SKILL, false, '2024-07-24T10:00:00.000Z',
      windowAccuracy(syntheticLedger(), SKILL),
    );
    expect(after[SKILL].retentionProbeDueAt).not.toBeNull();
    expect(new Date(after[SKILL].retentionProbeDueAt!).getTime())
      .toBeGreaterThan(new Date('2024-07-24T10:00:00.000Z').getTime());
  });

  it('still demotes when the evidence genuinely agrees the skill has decayed', () => {

    let weak: AttemptLedger = {};
    for (let i = 0; i < 6; i++) weak = appendToLedger(weak, SKILL, { c: false, l: 'abstract', d: '2024-07-22' });
    for (let i = 0; i < 4; i++) weak = appendToLedger(weak, SKILL, { c: true,  l: 'abstract', d: '2024-07-24' });

    const acc = windowAccuracy(weak, SKILL);           // 40%
    expect(acc).toBeLessThan(RETENTION_DEMOTION_ACCURACY);

    const after = applyProbeResult(mastered, SKILL, false, '2024-07-24T10:00:00.000Z', acc);
    expect(after[SKILL].status).toBe('בתהליך');
  });

  it('advances the probe schedule on a pass', () => {
    const after = applyProbeResult(mastered, SKILL, true, '2024-07-24T10:00:00.000Z', 0.9);
    expect(after[SKILL].status).toBe('שליטה');
    expect(after[SKILL].probesPassed).toBe(1);
  });
});

describe('mastery rules', () => {
  it('never grants mastery from pictorial work alone', () => {

    const { masteryMap, ledger } = run(
      Array.from({ length: 12 }, (_, i) => ({
        correct: true, layer: 'pictorial' as CPALayer,
        day: i < 6 ? '2024-07-13' : '2024-07-22',
      })),
    );
    expect(ledger[SKILL]).toBeUndefined();
    expect(masteryMap[SKILL].status).not.toBe('שליטה');
  });

  it('does not let pictorial wins pad the evidence window', () => {

    const { ledger } = run([
      ...abstractDay('2024-07-13', 6),
      ...Array.from({ length: 8 }, () => ({
        correct: true, layer: 'pictorial' as CPALayer, day: '2024-07-22',
      })),
    ]);
    expect(ledger[SKILL]).toHaveLength(6);
  });

  it('requires evidence across at least two distinct days', () => {

    const { masteryMap } = run(abstractDay('2024-07-13', 12));
    expect(masteryMap[SKILL].status).not.toBe('שליטה');
  });

  it('graduates on sustained abstract accuracy across days', () => {
    const { masteryMap } = run([
      ...abstractDay('2024-07-13', 5),
      ...abstractDay('2024-07-22', 5),
    ]);
    expect(masteryMap[SKILL].status).toBe('שליטה');
  });

  it('demotes when the window falls below the accuracy threshold', () => {
    const { masteryMap } = run(
      [
        ...abstractDay('2024-07-13', 5, false),
        ...abstractDay('2024-07-22', 5, false),
      ],
      'שליטה',
    );
    expect(masteryMap[SKILL].status).toBe('בתהליך');
  });

  it('ignores non-first attempts entirely', () => {

    let masteryMap: MasteryMap = {};
    let ledger: AttemptLedger = {};
    const retry = { ...attempt(true, 'abstract', '2024-07-13'), firstAttempt: false };
    ({ masteryMap, ledger } = applyAttemptToMastery({
      profileId: 'p', attempt: retry, masteryMap, ledger, isNewSessionForSkill: true,
    }));
    expect(ledger[SKILL]).toBeUndefined();
    expect(masteryMap[SKILL]).toBeUndefined();
  });
});

describe('ledger semantics', () => {
  it('keeps the window abstract-only, so accuracy IS abstract accuracy', () => {

    let lg: AttemptLedger = {};
    lg = appendToLedger(lg, SKILL, { c: true,  l: 'abstract',  d: '2024-07-13' });
    lg = appendToLedger(lg, SKILL, { c: false, l: 'pictorial', d: '2024-07-13' });
    lg = appendToLedger(lg, SKILL, { c: false, l: 'concrete',  d: '2024-07-13' });
    expect(lg[SKILL]).toHaveLength(1);
    expect(windowAccuracy(lg, SKILL)).toBe(1);
  });

  it('caps the window at the declared item minimum', () => {
    let lg: AttemptLedger = {};
    for (let i = 0; i < 25; i++) {
      lg = appendToLedger(lg, SKILL, { c: true, l: 'abstract', d: '2024-07-13' });
    }
    expect(lg[SKILL]).toHaveLength(10);
  });
});

describe('mergeMasteryMaps', () => {
  const rec = (skill: string, items: number, at: string): MasteryRecord => ({
    profileId: 'p', skillCode: skill, status: 'בתהליך', firstAttemptAccuracy: 0.7,
    itemCount: items, sessionCount: 2, lastPracticedAt: at,
    needsRetentionProbe: false, retentionProbeDueAt: null,
  });

  it('keeps practice this device has that the cloud has not seen', () => {

    const local  = { FRAC_PART_WHOLE: rec('FRAC_PART_WHOLE', 40, '2024-09-20T10:00:00.000Z') };
    const remote = { FRAC_PART_WHOLE: rec('FRAC_PART_WHOLE', 20, '2024-09-18T10:00:00.000Z') };
    expect(mergeMasteryMaps(local, remote).FRAC_PART_WHOLE.itemCount).toBe(40);
  });

  it('takes the cloud copy when the other device is further along', () => {
    const local  = { FRAC_PART_WHOLE: rec('FRAC_PART_WHOLE', 12, '2024-09-19T10:00:00.000Z') };
    const remote = { FRAC_PART_WHOLE: rec('FRAC_PART_WHOLE', 30, '2024-09-20T10:00:00.000Z') };
    expect(mergeMasteryMaps(local, remote).FRAC_PART_WHOLE.itemCount).toBe(30);
  });

  it('keeps skills either side has alone', () => {
    const merged = mergeMasteryMaps(
      { A: rec('A', 5, '2024-09-20T10:00:00.000Z') },
      { B: rec('B', 5, '2024-09-20T10:00:00.000Z') },
    );
    expect(Object.keys(merged).sort()).toEqual(['A', 'B']);
  });
});
