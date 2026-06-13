import { useMemo } from 'react';
import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import type { Profile } from '../types';
import { loadSessionRecords } from '../lib/sessionStore';
import { loadMasteryMap }     from '../lib/sessionStore';
import { masteredSkills }      from '../lib/masteryTracker';
import { computeTrophyState }  from '../lib/trophies';
import type { Trophy, SessionStar } from '../lib/trophies';

interface Props {
  profile: Profile | null;
  onBack:  () => void;
}

/**
 * Trophy room — stars, streak, badges, mastered skills.
 *
 * Layout:
 *   1. Flame streak card (current consecutive-day streak)
 *   2. Total-stars hero
 *   3. Per-session star strip
 *   4. Badge grid with progress bars on locked badges
 *   5. Mastered-skills wall
 */
export function TrophyRoom({ profile, onBack }: Props) {
  const g = { gender: 'f' as const };

  const records = useMemo(
    () => (profile ? loadSessionRecords(profile.profileId) : []),
    [profile?.profileId, profile?.sessionsCompleted],
  );

  const mastered = useMemo(() => {
    if (!profile) return [];
    const map = loadMasteryMap(profile.profileId);
    return masteredSkills(map);
  }, [profile?.profileId, profile?.sessionsCompleted]);

  const state = useMemo(
    () => computeTrophyState(records, mastered.length),
    [records, mastered.length],
  );

  const isEmpty = state.totalStars === 0 && state.earnedCount === 0;

  return (
    <div className="min-h-screen p-5 fade-in" dir="rtl" style={{ background: '#FFF8E8' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack} className="text-2xl" aria-label="חזרה">→</button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {t('trophy_room.title', g)} <span>🏆</span>
          </h2>
        </div>

        {isEmpty ? (
          <div className="bg-white card-shadow rounded-3xl p-8 text-center">
            <div className="text-6xl mb-4 pop-in inline-block">🏆</div>
            <p className="text-gray-600 text-lg">{t('trophy_room.empty', g)}</p>
            <p className="text-gray-400 mt-2 text-sm">תתאמני ותתחילי לאסוף!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">

            {/* ── Streak card ─────────────────────────────────────────────── */}
            <div
              className="rounded-3xl p-5 flex items-center gap-4 card-shadow"
              style={{ background: state.currentStreak > 0 ? '#FFF0D0' : '#F5F0E8' }}
            >
              <span className="text-5xl" style={{ lineHeight: 1 }}>
                {state.currentStreak > 0 ? '🔥' : '💤'}
              </span>
              <div>
                <div className="text-2xl font-bold" style={{ color: '#D96000' }}>
                  {state.currentStreak > 0
                    ? t('trophy_room.streak_active', { ...g, count: state.currentStreak })
                    : t('trophy_room.streak_zero', g)
                  }
                </div>
                {state.currentStreak > 0 && (
                  <div className="text-sm text-gray-500 mt-0.5">
                    {state.currentStreak === 1 ? 'יום אחד — המשיכי כך!' : 'כל הכבוד על ההמשכיות!'}
                  </div>
                )}
              </div>
            </div>

            {/* ── Total stars ─────────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5 flex items-center gap-4">
              <span className="text-5xl sparkle inline-block">⭐</span>
              <div>
                <div
                  className="text-5xl font-bold leading-none"
                  style={{ color: '#FF9B7A' }}
                >
                  {state.totalStars}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {t('trophy_room.total_stars', g)}
                </div>
              </div>
            </div>

            {/* ── Per-session strip ────────────────────────────────────────── */}
            {state.sessionStars.length > 0 && (() => {
              const STRIP_LIMIT = 30;
              // Show the most-recent STRIP_LIMIT sessions (array is chronological, so reverse then slice)
              const reversed    = state.sessionStars.slice().reverse();
              const visible     = reversed.slice(0, STRIP_LIMIT);
              const hiddenCount = reversed.length - visible.length;
              return (
                <div className="bg-white card-shadow rounded-3xl p-5">
                  <div className="text-sm font-semibold text-gray-500 mb-3">
                    {t('trophy_room.per_session', g)}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {visible.map(s => (
                      <SessionStarTile key={s.sessionId} s={s} />
                    ))}
                    {hiddenCount > 0 && (
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-[11px] text-gray-400 font-semibold"
                        style={{ background: '#EDE8E0' }}
                      >
                        +{hiddenCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── Badge grid ──────────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-sm font-semibold text-gray-500">
                  {t('trophy_room.badges', g)}
                </div>
                <div className="text-xs text-gray-400">
                  {t('trophy_room.badges_count', {
                    ...g,
                    earned: state.earnedCount,
                    total:  state.totalTrophies,
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {state.trophies.map(tr => (
                  <TrophyBadge key={tr.id} trophy={tr} />
                ))}
              </div>
            </div>

            {/* ── Mastered skills ─────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <div className="text-sm font-semibold text-gray-500 mb-3">
                {t('trophy_room.mastered_skills', g)}
              </div>
              {mastered.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {t('trophy_room.mastered_none', g)}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {mastered.map(skillCode => (
                    <div
                      key={skillCode}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2"
                      style={{ background: '#E8F7EE' }}
                    >
                      <span className="text-lg">✅</span>
                      <span className="text-sm font-medium text-[#2D3047]">
                        {t(`skill.${skillCode}` as LocaleKey, g)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SessionStarTile({ s }: { s: SessionStar }) {
  const bg =
    s.stars >= 3 ? '#FFC65C' :   // combo-boosted session
    s.stars === 2 ? '#FFD78A' :
    s.stars === 1 ? '#FFE8C7' :
                    '#EDE8E0';
  return (
    <div
      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all"
      style={{ background: bg, color: '#2D3047' }}
      title={`${s.pct}% · ${s.stars} ⭐`}
    >
      <span className="leading-none text-sm">
        {s.stars === 0 ? '·' : '⭐'.repeat(s.stars)}
      </span>
      <span className="text-[10px] text-[#6A6A6A] mt-0.5 font-bold">{s.pct}%</span>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function TrophyBadge({ trophy }: { trophy: Trophy }) {
  const g     = { gender: 'f' as const };
  const pct   = trophy.target > 0
    ? Math.round((trophy.progress / trophy.target) * 100)
    : 0;

  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all"
      style={{
        background: trophy.earned ? '#FFF3D6' : '#F5EFE6',
        border:     `2px solid ${trophy.earned ? '#FFD78A' : '#E0DACE'}`,
        opacity:    trophy.earned ? 1 : 0.7,
      }}
    >
      <span
        className={trophy.earned ? 'text-4xl pop-in inline-block' : 'text-4xl'}
        style={trophy.earned ? undefined : { filter: 'grayscale(1)' }}
      >
        {trophy.emoji}
      </span>
      <span className="text-xs text-center text-[#2D3047] font-medium leading-tight">
        {t(trophy.labelKey as LocaleKey, g)}
      </span>

      {/* Earned date — only on unlocked badges */}
      {trophy.earned && trophy.earnedAt && (
        <div className="text-[9px] text-[#B8860B] font-semibold mt-0.5">
          {formatShortDate(trophy.earnedAt)}
        </div>
      )}

      {/* Progress bar — only on locked badges with meaningful progress */}
      {!trophy.earned && trophy.target > 1 && (
        <div className="w-full mt-1">
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: '#E0D8CC' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width:      `${pct}%`,
                background: '#FFB347',
              }}
            />
          </div>
          <div className="text-[9px] text-gray-400 text-center mt-0.5">
            {trophy.progress}/{trophy.target}
          </div>
        </div>
      )}
    </div>
  );
}
