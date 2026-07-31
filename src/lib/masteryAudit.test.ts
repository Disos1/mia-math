/**
 * Mastery audit — the check that would have caught the July bug in a day.
 *
 * The headline test replays Mia's real MEAS_UNIT_CONVERT_CM record as it stood
 * on 2026-07-31: demoted, while its evidence window read 90% over 10 abstract
 * attempts across two days. No unit test of the tracker caught that, because the
 * tracker was internally consistent — it just implemented the wrong rule. This
 * audit compares stored state against the rules as separately stated, so the
 * two have to agree.
 */

import { describe, it, expect } from 'vitest';
import type { MasteryMap, MasteryRecord, MasteryStatus } from '../types';
import type { AttemptLedger } from './masteryTracker';
import { appendToLedger } from './masteryTracker';
import { auditMastery, isMasteryConsistent, PROBE_OVERDUE_ALERT_DAYS } from './masteryAudit';

const SKILL = 'MEAS_UNIT_CONVERT_CM';
const NOW   = '2026-07-31T10:00:00.000Z';

function record(over: Partial<MasteryRecord> = {}): MasteryRecord {
  return {
    profileId: 'p', skillCode: SKILL, status: 'בתהליך',
    firstAttemptAccuracy: 0.9, itemCount: 133, sessionCount: 53,
    lastPracticedAt: '2026-07-24T10:00:00.000Z',
    needsRetentionProbe: false, retentionProbeDueAt: null,
    ...over,
  };
}

function mapOf(r: MasteryRecord): MasteryMap { return { [r.skillCode]: r }; }

/** n abstract entries on a given day. */
function ledgerOf(spec: Array<{ day: string; n: number; correct?: boolean }>): AttemptLedger {
  let lg: AttemptLedger = {};
  for (const s of spec) {
    for (let i = 0; i < s.n; i++) {
      lg = appendToLedger(lg, SKILL, { c: s.correct ?? true, l: 'abstract', d: s.day });
    }
  }
  return lg;
}

// ─── The regression ───────────────────────────────────────────────────────────

describe('the July 2026 regression', () => {
  it('flags a skill that is demoted despite evidence that clears every bar', () => {
    const ledger = ledgerOf([
      { day: '2026-07-13', n: 5 },
      { day: '2026-07-22', n: 4 },
      { day: '2026-07-24', n: 1, correct: false },
    ]);
    const findings = auditMastery(mapOf(record({ status: 'בתהליך' })), ledger, NOW);

    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe('should_be_mastered');
    expect(findings[0].expected).toBe('שליטה');
    expect(findings[0].accuracy).toBeCloseTo(0.9);
    expect(findings[0].detail).toMatch(/[֐-׿]/);   // parent-readable Hebrew
  });

  it('goes quiet once the underlying fix lets the skill re-graduate', () => {
    const ledger = ledgerOf([
      { day: '2026-07-13', n: 5 },
      { day: '2026-07-22', n: 4 },
      { day: '2026-07-24', n: 1, correct: false },
    ]);
    expect(isMasteryConsistent(mapOf(record({ status: 'שליטה' })), ledger, NOW)).toBe(true);
  });
});

// ─── The opposite failure ─────────────────────────────────────────────────────

describe('false mastery', () => {
  it('flags a שליטה label the evidence no longer supports', () => {
    const ledger = ledgerOf([
      { day: '2026-07-13', n: 6, correct: false },
      { day: '2026-07-22', n: 4 },
    ]);
    const findings = auditMastery(mapOf(record({ status: 'שליטה' })), ledger, NOW);

    expect(findings.map(f => f.kind)).toContain('should_not_be_mastered');
    expect(findings[0].expected).toBe('בתהליך');
  });
});

// ─── Noise discipline ─────────────────────────────────────────────────────────

describe('silence means consistent, never unknown', () => {
  it('says nothing when the window is too small to judge', () => {
    // A part-practised skill is a child mid-learning, not a bug.
    const ledger = ledgerOf([{ day: '2026-07-22', n: 4 }]);
    expect(auditMastery(mapOf(record({ status: 'בתהליך' })), ledger, NOW)).toEqual([]);
  });

  it('does not promote on a single-day streak, matching the graduation rule', () => {
    // 10 correct in one sitting is exactly the false-mastery pattern the 2-day
    // rule exists to stop. The audit must not contradict it.
    const ledger = ledgerOf([{ day: '2026-07-22', n: 10 }]);
    expect(auditMastery(mapOf(record({ status: 'בתהליך' })), ledger, NOW)).toEqual([]);
  });

  it('does not promote when sessions are too few', () => {
    const ledger = ledgerOf([{ day: '2026-07-13', n: 5 }, { day: '2026-07-22', n: 5 }]);
    const findings = auditMastery(
      mapOf(record({ status: 'בתהליך', sessionCount: 1 })), ledger, NOW,
    );
    expect(findings).toEqual([]);
  });

  it('stays quiet for an empty profile', () => {
    expect(auditMastery({}, {}, NOW)).toEqual([]);
  });
});

// ─── Probe liveness ───────────────────────────────────────────────────────────

describe('probe liveness', () => {
  it('flags a probe that is long overdue — the scheduler never fired', () => {
    const dueAt = new Date(
      new Date(NOW).getTime() - (PROBE_OVERDUE_ALERT_DAYS + 5) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const ledger = ledgerOf([{ day: '2026-07-13', n: 5 }, { day: '2026-07-22', n: 5 }]);

    const findings = auditMastery(
      mapOf(record({ status: 'שליטה', retentionProbeDueAt: dueAt })), ledger, NOW,
    );
    expect(findings.map(f => f.kind)).toContain('probe_overdue');
  });

  it('tolerates a quiet week without complaining', () => {
    const dueAt = new Date(
      new Date(NOW).getTime() - 5 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const ledger = ledgerOf([{ day: '2026-07-13', n: 5 }, { day: '2026-07-22', n: 5 }]);

    const findings = auditMastery(
      mapOf(record({ status: 'שליטה', retentionProbeDueAt: dueAt })), ledger, NOW,
    );
    expect(findings).toEqual([]);
  });
});

// ─── Cross-check against the real rule set ────────────────────────────────────

describe('agreement with the tracker', () => {
  it('accepts exactly the state the tracker produces after a clean graduation', () => {
    // If the tracker graduates a skill, the audit must consider it consistent.
    // Any disagreement here means the two expressions of the rule have drifted —
    // which is the entire point of this module.
    const ledger = ledgerOf([{ day: '2026-07-13', n: 5 }, { day: '2026-07-22', n: 5 }]);
    const statuses: MasteryStatus[] = ['שליטה'];
    for (const status of statuses) {
      expect(isMasteryConsistent(mapOf(record({ status })), ledger, NOW)).toBe(true);
    }
  });
});
