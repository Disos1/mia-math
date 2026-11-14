/**
 * An empty abstract evidence window must not overwrite known accuracy with
 * zero. A pictorial answer adds no abstract evidence; cross-device hydration
 * and ledger merging must preserve that distinction.
 */
import { describe, it, expect } from 'vitest';
import type { MasteryRecord } from '../types';
import { applyAttemptToMastery, ledgerFromAttempts, mergeLedgers, reconcileAccuracy, type AttemptRow } from './masteryTracker';

const rec = (acc: number): MasteryRecord => ({
  profileId: 'p', skillCode: 'FRAC_OF_QUANTITY', status: 'בתהליך', firstAttemptAccuracy: acc,
  itemCount: 24, sessionCount: 4, lastPracticedAt: '2024-09-29T10:00:00.000Z',
  needsRetentionProbe: false, retentionProbeDueAt: null,
});
const attempt = (correct: boolean, layer: 'abstract' | 'pictorial') => ({
  attemptId: 'a', sessionId: 's', profileId: 'p', itemId: 'i', skillCode: 'FRAC_OF_QUANTITY',
  sessionPhase: 'blocked_practice', cpaLayer: layer, answer: 1, correct, firstAttempt: true,
  timeToAnswerMs: 1000, createdAt: '2024-10-21T10:00:00.000Z',
}) as never;

describe('the mastery window', () => {
  it('keeps the accuracy it had when an answer adds no abstract evidence', () => {
    const { masteryMap } = applyAttemptToMastery({
      profileId: 'p', attempt: attempt(true, 'pictorial'),
      masteryMap: { FRAC_OF_QUANTITY: rec(0.3) }, ledger: {}, isNewSessionForSkill: true,
    });
    expect(masteryMap.FRAC_OF_QUANTITY.firstAttemptAccuracy).toBe(0.3);
    expect(masteryMap.FRAC_OF_QUANTITY.itemCount).toBe(25);
  });

  it('is rebuilt from the answers saved in the cloud — the last ten abstract ones', () => {
    const rows: AttemptRow[] = Array.from({ length: 14 }, (_, i) => ({
      skill_code: 'FRAC_OF_QUANTITY', correct: i >= 4, cpa_layer: 'abstract',
      created_at: `2024-10-${String(1 + i).padStart(2, '0')}T10:00:00.000Z`,
    }));
    const ledger = ledgerFromAttempts(rows);
    expect(ledger.FRAC_OF_QUANTITY).toHaveLength(10);
    expect(ledger.FRAC_OF_QUANTITY.every(e => e.c)).toBe(true);       // the four old misses fell out
    const fixed = reconcileAccuracy({ FRAC_OF_QUANTITY: rec(0) }, ledger);
    expect(fixed.FRAC_OF_QUANTITY.firstAttemptAccuracy).toBe(1);
    expect(fixed.FRAC_OF_QUANTITY.status).toBe('בתהליך');              // a sync never graduates
  });

  it('prefers the fuller window when the two devices disagree', () => {
    const one  = { X: [{ c: false, l: 'abstract' as const, d: '2024-10-21' }] };
    const many = { X: Array.from({ length: 6 }, () => ({ c: true, l: 'abstract' as const, d: '2024-10-01' })) };
    expect(mergeLedgers(one, many).X).toHaveLength(6);
    expect(mergeLedgers(many, one).X).toHaveLength(6);
  });
});
