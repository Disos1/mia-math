/**
 * Supabase sync layer — write-through, localStorage is the read cache.
 *
 * Design:
 *   • All writes go to localStorage first (fast, works offline).
 *   • Then fire-and-forget to Supabase (no await on the hot path).
 *   • On first load after auth, the app pulls from Supabase to hydrate
 *     localStorage (so a new device gets Mia's full state).
 *
 * Critical state synced:
 *   - profiles        (identity, gap profile, onboarding flag)
 *   - mastery_records (skill status, accuracy, retention probe flags)
 *   - session_records (per-session summary — for cross-device parent dashboard)
 *
 * Auth user ID is set once on sign-in via initSync(). All push functions
 * are no-ops until that happens.
 */

import { supabase, SUPABASE_CONFIGURED } from './supabase';
import type { Profile, MasteryMap, SessionRecord } from '../types';

// ─── Module-level auth state ──────────────────────────────────────────────────

let _authUserId: string | null = null;

/** Call once when Supabase auth session is established. */
export function initSync(authUserId: string): void {
  _authUserId = authUserId;
}

/** Clear on sign-out. */
export function clearSync(): void {
  _authUserId = null;
}

// ─── Fire-and-forget wrapper ──────────────────────────────────────────────────

function fire(label: string, p: Promise<unknown>): void {
  p.catch(err => console.warn(`[sync] ${label} failed:`, err));
}

// ─── Profile ──────────────────────────────────────────────────────────────────

async function _pushProfile(profile: Profile, authUserId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        profile_id:              profile.profileId,
        auth_user_id:            authUserId,
        avatar_id:               profile.avatarId,
        gender:                  profile.gender,
        display_name:            profile.displayName,
        onboarding_complete:     profile.onboardingComplete,
        diagnostic_completed_at: profile.diagnosticCompletedAt,
        diagnostic_version:      profile.diagnosticVersion,
        gap_profile_json:        profile.gapProfileJson,
        sessions_completed:      profile.sessionsCompleted,
        created_at:              profile.createdAt,
      },
      { onConflict: 'profile_id' },
    );
  if (error) throw error;
}

/** Fire-and-forget profile push. No-op if not authed or Supabase not configured. */
export function syncProfile(profile: Profile): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushProfile', _pushProfile(profile, _authUserId));
}

/** Await-able pull — used at sign-in time to hydrate a new device. */
export async function pullProfile(authUserId: string): Promise<Profile | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) { console.warn('[sync] pullProfile error:', error.message); return null; }
  if (!data)  return null;

  return {
    profileId:             data.profile_id,
    avatarId:              data.avatar_id,
    gender:                data.gender,
    displayName:           data.display_name,
    onboardingComplete:    data.onboarding_complete,
    diagnosticCompletedAt: data.diagnostic_completed_at,
    diagnosticVersion:     data.diagnostic_version,
    gapProfileJson:        data.gap_profile_json,
    sessionsCompleted:     data.sessions_completed,
    createdAt:             data.created_at,
  };
}

// ─── Mastery map ──────────────────────────────────────────────────────────────

async function _pushMasteryMap(map: MasteryMap): Promise<void> {
  const rows = Object.values(map).map(r => ({
    profile_id:             r.profileId,
    skill_code:             r.skillCode,
    status:                 r.status,
    first_attempt_accuracy: r.firstAttemptAccuracy,
    item_count:             r.itemCount,
    session_count:          r.sessionCount,
    last_practiced_at:      r.lastPracticedAt,
    needs_retention_probe:  r.needsRetentionProbe,
    retention_probe_due_at: r.retentionProbeDueAt,
  }));
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('mastery_records')
    .upsert(rows, { onConflict: 'profile_id,skill_code' });
  if (error) throw error;
}

/** Fire-and-forget mastery push. No-op if not authed. */
export function syncMasteryMap(map: MasteryMap): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushMasteryMap', _pushMasteryMap(map));
}

/** Await-able pull — used at sign-in time. Returns null if no rows exist. */
export async function pullMasteryMap(profileId: string): Promise<MasteryMap | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('mastery_records')
    .select('*')
    .eq('profile_id', profileId);

  if (error) { console.warn('[sync] pullMasteryMap error:', error.message); return null; }
  if (!data || data.length === 0) return null;

  const map: MasteryMap = {};
  for (const r of data) {
    map[r.skill_code] = {
      profileId:            r.profile_id,
      skillCode:            r.skill_code,
      status:               r.status,
      firstAttemptAccuracy: r.first_attempt_accuracy,
      itemCount:            r.item_count,
      sessionCount:         r.session_count,
      lastPracticedAt:      r.last_practiced_at,
      needsRetentionProbe:  r.needs_retention_probe,
      retentionProbeDueAt:  r.retention_probe_due_at,
    };
  }
  return map;
}

// ─── Session records ──────────────────────────────────────────────────────────

async function _pushSessionRecord(record: SessionRecord): Promise<void> {
  const { error } = await supabase
    .from('session_records')
    .upsert(
      {
        session_id:         record.sessionId,
        profile_id:         record.profileId,
        mode:               record.mode,
        started_at:         record.startedAt,
        completed_at:       record.completedAt,
        items_attempted:    record.itemsAttempted,
        items_correct:      record.itemsCorrect,
        primary_skill_code: record.primarySkillCode,
      },
      { onConflict: 'session_id' },
    );
  if (error) throw error;
}

/** Fire-and-forget session record push. No-op if not authed. */
export function syncSessionRecord(record: SessionRecord): void {
  if (!SUPABASE_CONFIGURED || !_authUserId) return;
  fire('pushSessionRecord', _pushSessionRecord(record));
}

/** Await-able pull — used at sign-in time on a fresh device. */
export async function pullSessionRecords(profileId: string): Promise<SessionRecord[] | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const { data, error } = await supabase
    .from('session_records')
    .select('*')
    .eq('profile_id', profileId)
    .order('started_at', { ascending: false })
    .limit(30);

  if (error) { console.warn('[sync] pullSessionRecords error:', error.message); return null; }
  if (!data || data.length === 0) return null;

  return data.map(r => ({
    sessionId:        r.session_id,
    profileId:        r.profile_id,
    mode:             r.mode,
    startedAt:        r.started_at,
    completedAt:      r.completed_at,
    itemsAttempted:   r.items_attempted,
    itemsCorrect:     r.items_correct,
    primarySkillCode: r.primary_skill_code,
  }));
}

// ─── Hard delete (parent reset) ──────────────────────────────────────────────

/**
 * Delete all remote data for an auth user + profile.
 * Called by the parent-dashboard reset before sign-out so that the next
 * sign-in starts completely fresh (pullProfile returns null → welcome screen).
 */
export async function deleteRemoteProfile(
  authUserId: string,
  profileId:  string,
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await Promise.all([
      supabase.from('profiles')       .delete().eq('auth_user_id', authUserId),
      supabase.from('mastery_records').delete().eq('profile_id',   profileId),
      supabase.from('session_records').delete().eq('profile_id',   profileId),
    ]);
    console.info('[sync] remote profile deleted');
  } catch (err) {
    console.warn('[sync] deleteRemoteProfile failed:', err);
  }
}

// ─── One-time migration ───────────────────────────────────────────────────────

/**
 * Called once when a user signs in on a device that already has localStorage
 * data but no remote profile. Pushes local state up to Supabase.
 */
export async function migrateLocalToRemote(
  profile:    Profile,
  masteryMap: MasteryMap,
  authUserId: string,
): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;
  try {
    await _pushProfile(profile, authUserId);
    await _pushMasteryMap(masteryMap);
    console.info('[sync] migration complete — local data pushed to Supabase');
  } catch (err) {
    console.warn('[sync] migration failed:', err);
  }
}

/**
 * Push an array of session records to Supabase.
 * Called once during migration when a device has local sessions
 * that have never been synced.
 */
export async function migrateSessionRecords(records: SessionRecord[]): Promise<void> {
  if (!SUPABASE_CONFIGURED || records.length === 0) return;
  try {
    for (const r of records) await _pushSessionRecord(r);
    console.info(`[sync] migrated ${records.length} session records`);
  } catch (err) {
    console.warn('[sync] migrateSessionRecords failed:', err);
  }
}
