import type { Profile, AvatarId } from '../types';
import { syncProfile } from './sync';

const STORAGE_KEY = 'mia_profile';

/**
 * Profile store — localStorage-backed for offline support, Supabase write-through.
 *
 * Every write hits localStorage first (fast, works offline), then fires a
 * fire-and-forget push to Supabase via syncProfile(). syncProfile() is a no-op
 * until initSync() has been called with a valid auth user ID.
 */

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  syncProfile(profile); // fire-and-forget; no-op if not authed
}

export function createProfile(avatarId: AvatarId): Profile {
  const profile: Profile = {
    profileId:             crypto.randomUUID(),
    avatarId,
    gender:                'f',
    displayName:           'מיה',
    onboardingComplete:    false,
    diagnosticCompletedAt: null,
    diagnosticVersion:     null,
    gapProfileJson:        null,
    sessionsCompleted:     0,
    createdAt:             new Date().toISOString(),
  };
  saveProfile(profile);
  return profile;
}

export function updateProfile(updates: Partial<Profile>): Profile {
  const current = loadProfile();
  if (!current) throw new Error('No profile to update');
  const updated = { ...current, ...updates };
  saveProfile(updated);
  return updated;
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Re-diagnostic trigger: fires if either threshold is met (whichever comes first). */
export function isRediagnosticDue(profile: Profile): boolean {
  if (!profile.diagnosticCompletedAt) return false;

  const { REDIAG_SESSION_THRESHOLD, REDIAG_DAY_THRESHOLD } = (() => ({
    REDIAG_SESSION_THRESHOLD: 10,
    REDIAG_DAY_THRESHOLD: 7,
  }))();

  const sessionsDue = profile.sessionsCompleted >= REDIAG_SESSION_THRESHOLD;

  const daysSinceDiag =
    (Date.now() - new Date(profile.diagnosticCompletedAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const timeDue = daysSinceDiag >= REDIAG_DAY_THRESHOLD;

  return sessionsDue || timeDue;
}
