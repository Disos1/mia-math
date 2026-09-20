// @vitest-environment jsdom
/**
 * Progress must survive a session she never finishes.
 *
 * Mia's own records showed the failure: whole days (27 Jul, 1 Aug, 28 Aug) where
 * every session stored 0 questions answered, and 7 Sept with 20 answered but no
 * attempts at all. She practised; the dashboard and the daily email said she had
 * not. Everything was held in memory until finish(), and the only safety net was
 * `visibilitychange`, which iOS Safari does not reliably fire on tab close.
 *
 * So this test answers ONE question in a real session and demands that the
 * answer is already stored — no finish, no visibility event, no unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { Profile, MasteryMap, MasteryRecord, SessionRecord, PracticeAttempt } from '../types';
import { Session } from './Session';

const PROFILE_ID = 'test-mia';

const profile: Profile = {
  profileId: PROFILE_ID, avatarId: 'fox', gender: 'f', displayName: 'מיה',
  onboardingComplete: true, diagnosticCompletedAt: '2026-09-01T00:00:00.000Z',
  diagnosticVersion: 1, sessionsCompleted: 12, createdAt: '2026-04-20T00:00:00.000Z',
} as Profile;

const rec = (s: string, a: number, n: number): MasteryRecord => ({
  profileId: PROFILE_ID, skillCode: s, status: 'בתהליך', firstAttemptAccuracy: a, itemCount: n,
  sessionCount: 4, lastPracticedAt: '2026-09-07T00:00:00.000Z',
  needsRetentionProbe: false, retentionProbeDueAt: null,
});

const mastery: MasteryMap = {
  ARITH_MULT_6_9:         { ...rec('ARITH_MULT_6_9', 0.9, 120), status: 'שליטה' },
  ARITH_SUB_REGROUP_ZERO: rec('ARITH_SUB_REGROUP_ZERO', 0.7, 80),
  PLACE_VALUE_TO_MILLION: { ...rec('PLACE_VALUE_TO_MILLION', 0.9, 40), status: 'שליטה' },
};

const read = <T,>(key: string, fallback: T): T => {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(`mia_mastery::${PROFILE_ID}`, JSON.stringify(mastery));
  localStorage.setItem('mia_profile', JSON.stringify(profile));
  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...globalThis.crypto, randomUUID: () => `id-${Math.random().toString(16).slice(2)}` },
      configurable: true,
    });
  }
});

// Vitest runs without globals, so testing-library's auto-cleanup is not wired up:
// without this, the previous test's session stays mounted and the queries below
// find ITS buttons.
afterEach(cleanup);

/** Answer the question on screen, whatever its answer mode — right or wrong. */
function answerFirstQuestion(): void {
  const buttons = screen.getAllByRole('button');
  const text    = (b: HTMLElement) => b.textContent?.trim() ?? '';
  // Worked example / teaching slots are walked through, not answered.
  const advance = buttons.find(b => /הבא|עכשיו תורי/.test(text(b)));
  if (advance) { fireEvent.click(advance); return answerFirstQuestion(); }

  const submit = buttons.find(b => text(b) === '✓');
  if (submit) {                                   // keypad item: type a digit, submit
    fireEvent.click(buttons.find(b => text(b) === '1')!);
    fireEvent.click(submit);
    return;
  }
  fireEvent.click(buttons.filter(b => !/יציאה|הורה/.test(text(b)))[0]);
}

describe('an unfinished session still records what she did', () => {
  it('stores the attempt and the session record on the FIRST answer', async () => {
    render(<Session profile={profile} mode="quantity" onComplete={vi.fn()} onTrophyRoom={vi.fn()} onParent={vi.fn()} />);

    // Nothing answered yet: a draft record exists, with nothing in it.
    expect(read<SessionRecord[]>(`mia_sessions::${PROFILE_ID}`, [])[0]?.itemsAttempted).toBe(0);

    answerFirstQuestion();

    await waitFor(() => {
      const attempts = read<PracticeAttempt[]>(`mia_attempts::${PROFILE_ID}`, []);
      expect(attempts.length, 'attempt stored immediately').toBeGreaterThan(0);
    });

    const records = read<SessionRecord[]>(`mia_sessions::${PROFILE_ID}`, []);
    expect(records).toHaveLength(1);
    expect(records[0].itemsAttempted, 'session record counts the answer').toBe(1);
    expect(records[0].completedAt, 'still open — she has not finished').toBeNull();
  });

  it('does not store the same attempt twice as she keeps going', async () => {
    render(<Session profile={profile} mode="quantity" onComplete={vi.fn()} onTrophyRoom={vi.fn()} onParent={vi.fn()} />);

    answerFirstQuestion();
    await waitFor(() => expect(read<PracticeAttempt[]>(`mia_attempts::${PROFILE_ID}`, []).length).toBe(1));
    // A background event mid-session must not duplicate what is already stored.
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));

    const attempts = read<PracticeAttempt[]>(`mia_attempts::${PROFILE_ID}`, []);
    expect(new Set(attempts.map(a => a.id)).size).toBe(attempts.length);
    expect(attempts).toHaveLength(1);
  });
});
