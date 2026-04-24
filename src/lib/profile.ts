import type { Profile, AvatarId } from '../types';

const STORAGE_KEY = 'mia_profile';

/**
 * Profile store — localStorage-backed for offline support, Supabase-synced when online.
 *
 * Phase 0: localStorage only. Supabase sync added in Phase 1.
 *
 * All state is profile-keyed from day one. Even though v1 has only one profile
 * (Mia's), the data model supports multi-profile for future use (Leo, Alice).
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
