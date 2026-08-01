/**
 * Session lifecycle: a completed session must stay completed.
 *
 * Mia answered every question in a 20-item session and the dashboard still
 * labelled it "partial". Cause: finish() writes the record with a real
 * completedAt, and the visibilitychange handler writes the SAME sessionId with
 * completedAt: null — so closing the app on the end card downgraded it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { upsertSessionRecord, loadSessionRecords } from './sessionStore';
import type { SessionRecord } from '../types';

// The suite runs in plain node (no jsdom), so give the store a minimal
// localStorage. Stubbing it here beats adding a DOM environment for two tests.
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
} as Storage;

const PROFILE = 'test-profile';

function record(over: Partial<SessionRecord>): SessionRecord {
  return {
    sessionId: 'sess-1', profileId: PROFILE, mode: 'quantity',
    startedAt: '2026-08-01T10:00:00.000Z', completedAt: null,
    itemsAttempted: 19, itemsCorrect: 17,
    primarySkillCode: 'ARITH_ADD_REGROUP', maxCombo: 8,
    ...over,
  } as SessionRecord;
}

describe('upsertSessionRecord', () => {
  beforeEach(() => localStorage.clear());

  it('replaces by sessionId rather than appending a duplicate', () => {
    upsertSessionRecord(PROFILE, record({}));
    upsertSessionRecord(PROFILE, record({ completedAt: '2026-08-01T10:20:00.000Z' }));
    const all = loadSessionRecords(PROFILE).filter(r => r.sessionId === 'sess-1');
    expect(all).toHaveLength(1);
    expect(all[0].completedAt).not.toBeNull();
  });

  it('a later draft write WOULD clobber a completed record — hence the finishedRef guard', () => {
    // Documents the hazard the guard prevents: the store has no notion of
    // "already finished", so the caller must not write a draft after finish().
    // If this ever starts failing, the guard has moved into the store and the
    // Session-level ref can be reconsidered.
    upsertSessionRecord(PROFILE, record({ completedAt: '2026-08-01T10:20:00.000Z' }));
    upsertSessionRecord(PROFILE, record({ completedAt: null }));
    const found = loadSessionRecords(PROFILE).find(r => r.sessionId === 'sess-1');
    expect(found?.completedAt).toBeNull();
  });
});
