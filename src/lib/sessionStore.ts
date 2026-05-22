/**
 * Session persistence — localStorage primary, Supabase write-through.
 *
 * Stores MasteryMap + per-skill attempt ledger + the last N session records
 * in localStorage. Profile-keyed so multi-profile support is additive.
 *
 * MasteryMap changes are pushed to Supabase after every write (fire-and-forget)
 * so progress survives a device swap. The attempt ledger and session/attempt
 * records stay local-only for now (analytics, not critical for continuity).
 */

import type {
  MasteryMap,
  SessionRecord,
  PracticeAttempt,
} from '../types';
import type { AttemptLedger } from './masteryTracker';
import { syncMasteryMap, syncSessionRecord } from './sync';

const KEY_MASTERY  = (profileId: string) => `mia_mastery::${profileId}`;
const KEY_LEDGER   = (profileId: string) => `mia_ledger::${profileId}`;
const KEY_SESSIONS = (profileId: string) => `mia_sessions::${profileId}`;
const KEY_ATTEMPTS = (profileId: string) => `mia_attempts::${profileId}`;

const MAX_SESSIONS = 500;  // retention cap — sessions are ~200 bytes each; 500 ≈ 100 KB
const MAX_ATTEMPTS = 500;  // retention cap for attempts (trimmed oldest-first)

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota exceeded or disabled — silent failure, no crash
  }
}

// ─── Mastery ────────────────────────────────────────────────────────────────

export function loadMasteryMap(profileId: string): MasteryMap {
  return read<MasteryMap>(KEY_MASTERY(profileId), {});
}

export function saveMasteryMap(profileId: string, map: MasteryMap): void {
  write(KEY_MASTERY(profileId), map);
  syncMasteryMap(map); // fire-and-forget; no-op if not authed
}

// ─── Attempt ledger (rolling-window per skill) ──────────────────────────────

export function loadLedger(profileId: string): AttemptLedger {
  return read<AttemptLedger>(KEY_LEDGER(profileId), {});
}

export function saveLedger(profileId: string, ledger: AttemptLedger): void {
  write(KEY_LEDGER(profileId), ledger);
}

// ─── Session records ────────────────────────────────────────────────────────

export function loadSessionRecords(profileId: string): SessionRecord[] {
  return read<SessionRecord[]>(KEY_SESSIONS(profileId), []);
}

export function appendSessionRecord(profileId: string, record: SessionRecord): void {
  const cur  = loadSessionRecords(profileId);
  const next = [...cur, record].slice(-MAX_SESSIONS);
  write(KEY_SESSIONS(profileId), next);
  syncSessionRecord(record); // fire-and-forget; no-op if not authed
}

/** Upsert by sessionId — updates existing record or appends new one. Used for
 *  partial-session drafts (completedAt: null) and the final finish() call. */
export function upsertSessionRecord(profileId: string, record: SessionRecord): void {
  const cur = loadSessionRecords(profileId);
  const idx = cur.findIndex(r => r.sessionId === record.sessionId);
  const next = idx >= 0
    ? cur.map((r, i) => (i === idx ? record : r))
    : [...cur, record].slice(-MAX_SESSIONS);
  write(KEY_SESSIONS(profileId), next);
  syncSessionRecord(record);
}

/** Overwrite local session records with data pulled from Supabase (hydration only). */
export function hydrateSessionRecords(profileId: string, records: SessionRecord[]): void {
  write(KEY_SESSIONS(profileId), records.slice(-MAX_SESSIONS));
}

// ─── Attempts (for later analytics / parent report) ─────────────────────────

export function loadAttempts(profileId: string): PracticeAttempt[] {
  return read<PracticeAttempt[]>(KEY_ATTEMPTS(profileId), []);
}

export function appendAttempts(profileId: string, newAttempts: PracticeAttempt[]): void {
  const cur  = loadAttempts(profileId);
  const next = [...cur, ...newAttempts].slice(-MAX_ATTEMPTS);
  write(KEY_ATTEMPTS(profileId), next);
}

// ─── Bulk clear (used by parent reset) ──────────────────────────────────────

export function clearAllSessionData(profileId: string): void {
  for (const k of [
    KEY_MASTERY(profileId),
    KEY_LEDGER(profileId),
    KEY_SESSIONS(profileId),
    KEY_ATTEMPTS(profileId),
  ]) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}
