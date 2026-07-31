/**
 * Mastery rules — the invariants Dima reads on the dashboard.
 *
 * Every test here encodes a stated pedagogical rule. If a rule changes, a test
 * must change with it; if a rule has no test, it will silently rot — which is
 * precisely how MEAS_UNIT_CONVERT_CM ended up stuck at בתהליך with 90% accuracy.
 */

import { describe, it, expect } from 'vitest';
import type { PracticeAttempt, MasteryMap, CPALayer } from '../types';
import {
  applyAttemptToMastery, applyProbeResult, appendToLedger, windowAccuracy,
} from './masteryTracker';
import type { AttemptLedger } from './masteryTracker';
import { RETENTION_DEMOTION_ACCURACY } from '../constants/config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

/** Feed a sequence of attempts through the tracker, returning final state. */
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
      lastPracticedAt: '2026-07-01T00:00:00.000Z',
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

// ─── The regression that started this ─────────────────────────────────────────

describe("Mia's unit-conversion regression (2026-07-31)", () => {
  /**
   * Her real ledger: 5 correct abstract on 07-13, 5 correct abstract on 07-22,
   * then one MISSED retention probe on 07-24. Window accuracy = 90%.
   *
   * The old code demoted on that single miss, so a skill she demonstrably knew
   * dropped to בתהליך and started consuming her practice sessions again.
   */
  function miaLedger(): AttemptLedger {
    let lg: AttemptLedger = {};
    for (const d of ['2026-07-13', '2026-07-22']) {
      for (let i = 0; i < 5; i++) lg = appendToLedger(lg, SKILL, { c: true, l: 'abstract', d });
    }
    return appendToLedger(lg, SKILL, { c: false, l: 'abstract', d: '2026-07-24' });
  }

  const mastered: MasteryMap = { [SKILL]: {
    profileId: 'p', skillCode: SKILL, status: 'שליטה',
    firstAttemptAccuracy: 0.9, itemCount: 133, sessionCount: 53,
    lastPracticedAt: '2026-07-24T10:00:00.000Z',
    needsRetentionProbe: true, retentionProbeDueAt: '2026-07-24T00:00:00.000Z',
  } };

  it('keeps mastery when one probe is missed but the window still supports it', () => {
    const acc = windowAccuracy(miaLedger(), SKILL);
    expect(acc).toBeGreaterThan(RETENTION_DEMOTION_ACCURACY);

    const after = applyProbeResult(mastered, SKILL, false, '2026-07-24T10:00:00.000Z', acc);
    expect(after[SKILL].status).toBe('שליטה');
  });

  it('re-probes soon rather than waiting the full schedule', () => {
    // Holding mastery must not mean ignoring the miss.
    const after = applyProbeResult(
      mastered, SKILL, false, '2026-07-24T10:00:00.000Z',
      windowAccuracy(miaLedger(), SKILL),
    );
    expect(after[SKILL].retentionProbeDueAt).not.toBeNull();
    expect(new Date(after[SKILL].retentionProbeDueAt!).getTime())
      .toBeGreaterThan(new Date('2026-07-24T10:00:00.000Z').getTime());
  });

  it('still demotes when the evidence genuinely agrees the skill has decayed', () => {
    // The rule must keep its teeth: a miss plus a weak window = real decay.
    let weak: AttemptLedger = {};
    for (let i = 0; i < 6; i++) weak = appendToLedger(weak, SKILL, { c: false, l: 'abstract', d: '2026-07-22' });
    for (let i = 0; i < 4; i++) weak = appendToLedger(weak, SKILL, { c: true,  l: 'abstract', d: '2026-07-24' });

    const acc = windowAccuracy(weak, SKILL);           // 40%
    expect(acc).toBeLessThan(RETENTION_DEMOTION_ACCURACY);

    const after = applyProbeResult(mastered, SKILL, false, '2026-07-24T10:00:00.000Z', acc);
    expect(after[SKILL].status).toBe('בתהליך');
  });

  it('advances the probe schedule on a pass', () => {
    const after = applyProbeResult(mastered, SKILL, true, '2026-07-24T10:00:00.000Z', 0.9);
    expect(after[SKILL].status).toBe('שליטה');
    expect(after[SKILL].probesPassed).toBe(1);
  });
});

// ─── The rules themselves ─────────────────────────────────────────────────────

describe('mastery rules', () => {
  it('never grants mastery from pictorial work alone', () => {
    // "Mastery at pictorial-only is not mastery" — PRD §8.3. Enforced by
    // appendToLedger, which keeps the evidence ledger abstract-only.
    const { masteryMap, ledger } = run(
      Array.from({ length: 12 }, (_, i) => ({
        correct: true, layer: 'pictorial' as CPALayer,
        day: i < 6 ? '2026-07-13' : '2026-07-22',
      })),
    );
    expect(ledger[SKILL]).toBeUndefined();
    expect(masteryMap[SKILL].status).not.toBe('שליטה');
  });

  it('does not let pictorial wins pad the evidence window', () => {
    // 6 abstract + 8 pictorial must count as 6 items, not 14 — otherwise easy
    // scaffolded answers would manufacture mastery.
    const { ledger } = run([
      ...abstractDay('2026-07-13', 6),
      ...Array.from({ length: 8 }, () => ({
        correct: true, layer: 'pictorial' as CPALayer, day: '2026-07-22',
      })),
    ]);
    expect(ledger[SKILL]).toHaveLength(6);
  });

  it('requires evidence across at least two distinct days', () => {
    // A single lucky session cannot mint mastery.
    const { masteryMap } = run(abstractDay('2026-07-13', 12));
    expect(masteryMap[SKILL].status).not.toBe('שליטה');
  });

  it('graduates on sustained abstract accuracy across days', () => {
    const { masteryMap } = run([
      ...abstractDay('2026-07-13', 5),
      ...abstractDay('2026-07-22', 5),
    ]);
    expect(masteryMap[SKILL].status).toBe('שליטה');
  });

  it('demotes when the window falls below the accuracy threshold', () => {
    const { masteryMap } = run(
      [
        ...abstractDay('2026-07-13', 5, false),
        ...abstractDay('2026-07-22', 5, false),
      ],
      'שליטה',
    );
    expect(masteryMap[SKILL].status).toBe('בתהליך');
  });

  it('ignores non-first attempts entirely', () => {
    // Retries must never feed the ledger — that was the original inflation bug.
    let masteryMap: MasteryMap = {};
    let ledger: AttemptLedger = {};
    const retry = { ...attempt(true, 'abstract', '2026-07-13'), firstAttempt: false };
    ({ masteryMap, ledger } = applyAttemptToMastery({
      profileId: 'p', attempt: retry, masteryMap, ledger, isNewSessionForSkill: true,
    }));
    expect(ledger[SKILL]).toBeUndefined();
    expect(masteryMap[SKILL]).toBeUndefined();
  });
});

// ─── Helper semantics ─────────────────────────────────────────────────────────

describe('ledger semantics', () => {
  it('keeps the window abstract-only, so accuracy IS abstract accuracy', () => {
    // This is load-bearing: every other rule reads `windowAccuracy` and assumes
    // it describes abstract work. If appendToLedger ever admits other layers,
    // mastery silently becomes purchasable with scaffolded answers.
    let lg: AttemptLedger = {};
    lg = appendToLedger(lg, SKILL, { c: true,  l: 'abstract',  d: '2026-07-13' });
    lg = appendToLedger(lg, SKILL, { c: false, l: 'pictorial', d: '2026-07-13' });
    lg = appendToLedger(lg, SKILL, { c: false, l: 'concrete',  d: '2026-07-13' });
    expect(lg[SKILL]).toHaveLength(1);
    expect(windowAccuracy(lg, SKILL)).toBe(1);
  });

  it('caps the window at the declared item minimum', () => {
    let lg: AttemptLedger = {};
    for (let i = 0; i < 25; i++) {
      lg = appendToLedger(lg, SKILL, { c: true, l: 'abstract', d: '2026-07-13' });
    }
    expect(lg[SKILL]).toHaveLength(10);
  });
});
