/**
 * Family Link time limits reload the page mid-session (Dima, 2026-10-27).
 * The session must come back where she was, not restart.
 */
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { SessionPlan, SessionPlanItem, PracticeAttempt } from '../types';
import { saveLiveSession, loadLiveSession, clearLiveSession, resumeIndex, RESUME_WINDOW_MS, type LiveSession } from './liveSession';

const item = (id: string) => ({ item: { itemId: id } } as unknown as SessionPlanItem);
const att = (id: string, correct: boolean) => ({ itemId: id, correct } as unknown as PracticeAttempt);
const live = (over: Partial<LiveSession> = {}): LiveSession => ({
  v: 1, profileId: 'p', plan: { targetItems: 4 } as unknown as SessionPlan,
  items: ['a', 'b', 'c', 'd'].map(item), index: 1,
  attempts: [att('a', true), att('b', true)], cpaBySkill: {}, combo: 2, maxCombo: 2,
  counted: false, savedAt: new Date().toISOString(), ...over,
});

describe('resuming an interrupted session', () => {
  beforeEach(() => localStorage.clear());

  it('comes back with the same questions and moves past one she already got right', () => {
    saveLiveSession(live());
    const s = loadLiveSession('p')!;
    expect(s.items.map(i => i.item.itemId)).toEqual(['a', 'b', 'c', 'd']);
    expect(resumeIndex(s)).toBe(2);
  });

  it('stays on a question she had answered wrong, to try it again', () => {
    saveLiveSession(live({ attempts: [att('a', true), att('b', false)] }));
    expect(resumeIndex(loadLiveSession('p')!)).toBe(1);
  });

  it('starts fresh after half a day, after the last question, or once cleared', () => {
    saveLiveSession(live({ savedAt: new Date(Date.now() - RESUME_WINDOW_MS - 1000).toISOString() }));
    expect(loadLiveSession('p')).toBeNull();
    saveLiveSession(live({ index: 3, attempts: ['a', 'b', 'c', 'd'].map(id => att(id, true)) }));
    expect(loadLiveSession('p')).toBeNull();
    saveLiveSession(live());
    clearLiveSession('p');
    expect(loadLiveSession('p')).toBeNull();
  });

  it('never hands one child another child’s session', () => {
    saveLiveSession(live());
    expect(loadLiveSession('someone-else')).toBeNull();
  });
});
