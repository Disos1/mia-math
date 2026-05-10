/**
 * Cross-session memorization defense — tracks the last N itemIds seen by a
 * profile so the generator can avoid them when composing the next session.
 *
 * Pure-localStorage; no Supabase sync (the buffer is reconstructable from
 * `session_attempts` if we ever want to hydrate a fresh device).
 */

const KEY = (profileId: string) => `mia_math::recent_items::${profileId}`;
const MAX_RECENT = 100;

export function loadRecentItemIds(profileId: string): Set<string> {
  try {
    const raw = localStorage.getItem(KEY(profileId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Append new itemIds to the buffer (most-recent at end), dedupe, cap at MAX_RECENT. */
export function appendRecentItemIds(profileId: string, ids: string[]): void {
  if (!ids || ids.length === 0) return;
  try {
    const raw = localStorage.getItem(KEY(profileId));
    const cur = raw ? (JSON.parse(raw) as string[]) : [];
    const seen = new Set<string>();
    const merged: string[] = [];
    // Walk from the end so the most-recent occurrence wins on dedupe
    for (const id of [...cur, ...ids].reverse()) {
      if (seen.has(id)) continue;
      seen.add(id);
      merged.unshift(id);
    }
    const capped = merged.slice(-MAX_RECENT);
    localStorage.setItem(KEY(profileId), JSON.stringify(capped));
  } catch {
    // localStorage quota errors etc — non-fatal, just skip the update
  }
}
