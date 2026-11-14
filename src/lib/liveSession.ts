/**
 * The session in progress, saved after every answer so it can be resumed.
 *
 * A device time limit, reload or closed tab can interrupt a session. Persisting
 * answers alone is insufficient: the question sequence, position and combo
 * must also survive so resumption does not restart at question one.
 *
 * Now the whole session is stored locally and picked up again on the next
 * start, as long as it is recent. Same session id, so the record she was
 * building continues instead of a second one starting.
 */

import type { SessionPlan, SessionPlanItem, PracticeAttempt } from '../types';

/** Older than this, a half-done session is stale — start fresh. */
export const RESUME_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface LiveSession {
  v:          1;
  profileId:  string;
  plan:       SessionPlan;
  items:      SessionPlanItem[];
  index:      number;
  attempts:   PracticeAttempt[];
  /** Per-skill CPA state (cpaState.ts), opaque here. */
  cpaBySkill: Record<string, unknown>;
  combo:      number;
  maxCombo:   number;
  /** Already counted in profile.sessionsCompleted — must not count twice. */
  counted:    boolean;
  savedAt:    string;
}

const KEY = (profileId: string) => `mia_live_session::${profileId}`;

export function saveLiveSession(s: LiveSession): void {
  try { localStorage.setItem(KEY(s.profileId), JSON.stringify(s)); } catch { /* storage full/disabled */ }
}

export function clearLiveSession(profileId: string): void {
  try { localStorage.removeItem(KEY(profileId)); } catch { /* ignore */ }
}

export function loadLiveSession(profileId: string, now = Date.now()): LiveSession | null {
  try {
    const raw = localStorage.getItem(KEY(profileId));
    if (!raw) return null;
    const s = JSON.parse(raw) as LiveSession;
    if (s.v !== 1 || s.profileId !== profileId || !Array.isArray(s.items)) return null;
    if (now - new Date(s.savedAt).getTime() > RESUME_WINDOW_MS) { clearLiveSession(profileId); return null; }
    const end = Math.min(s.items.length, s.plan.targetItems ?? Infinity);
    if (resumeIndex(s) >= end) { clearLiveSession(profileId); return null; }   // nothing left to do
    return s;
  } catch {
    return null;
  }
}

/** Where to pick up: the saved position, moved past an item she already got right. */
export function resumeIndex(s: LiveSession): number {
  let i = s.index;
  while (i < s.items.length && s.attempts.some(a => a.itemId === s.items[i].item.itemId && a.correct)) i++;
  return i;
}
