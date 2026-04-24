import { useMemo } from 'react';
import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import type { Profile } from '../types';
import { loadSessionRecords } from '../lib/sessionStore';
import { computeTrophyState } from '../lib/trophies';
import type { Trophy, SessionStar } from '../lib/trophies';

interface Props {
  profile: Profile | null;
  onBack:  () => void;
}

/**
 * Trophy room — celebration screen for Mia's accumulated stars + milestone
 * badges. Recomputes from session records on mount; no separate persistence.
 *
 * Layout:
 *   1. Total-stars hero card
 *   2. Per-session star strip (newest first, capped — older ones collapse)
 *   3. Badge grid: earned (bright) vs. locked (greyed)
 */
export function TrophyRoom({ profile, onBack }: Props) {
  const g = { gender: 'f' as const };

  const records = useMemo(
    () => (profile ? loadSessionRecords(profile.profileId) : []),
    [profile?.profileId, profile?.sessionsCompleted],
  );

  const state = useMemo(() => computeTrophyState(records), [records]);

  const isEmpty = state.totalStars === 0 && state.earnedCount === 0;

  return (
    <div className="min-h-screen p-6 fade-in" style={{ background: '#FFF8E8' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-2xl" aria-label="חזרה">→</button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {t('trophy_room.title', g)} <span>🏆</span>
          </h2>
        </div>

        {isEmpty && (
          <div className="bg-white card-shadow rounded-3xl p-8 text-center">
            <div className="text-6xl mb-4 pop-in inline-block">🏆</div>
            <p className="text-gray-600">{t('trophy_room.empty', g)}</p>
          </div>
        )}

        {!isEmpty && (
          <div className="flex flex-col gap-4">

            {/* ── Total stars hero ───────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-6 text-center">
              <div className="text-5xl mb-2 sparkle inline-block">⭐</div>
              <div
                className="text-5xl font-bold leading-none"
                style={{ color: '#FF9B7A' }}
              >
                {state.totalStars}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                {t('trophy_room.total_stars', g)}
              </div>
            </div>

            {/* ── Per-session star strip ────────────────────────────────── */}
            {state.sessionStars.length > 0 && (
              <div className="bg-white card-shadow rounded-3xl p-5">
                <div className="text-sm font-medium text-gray-500 mb-3">
                  {t('trophy_room.per_session', g)}
                </div>
                {/* Newest first so the most recent session sits at the top-right */}
                <div className="flex flex-wrap gap-2 justify-start">
                  {state.sessionStars.slice().reverse().map(s => (
                    <SessionStarTile key={s.sessionId} s={s} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Badge grid ─────────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <div className="flex items-baseline justify-between mb-3">
                <div className="text-sm font-medium text-gray-500">
                  {t('trophy_room.badges', g)}
                </div>
                <div className="text-xs text-gray-500">
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

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SessionStarTile({ s }: { s: SessionStar }) {
  const bg =
    s.stars === 2 ? '#FFD78A' :
    s.stars === 1 ? '#FFE8C7' :
                    '#EDE8E0';
  return (
    <div
      className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all"
      style={{ background: bg, color: '#2D3047' }}
      title={`${s.pct}%`}
    >
      <span className="leading-none text-base">
        {s.stars === 2 ? '⭐⭐' : s.stars === 1 ? '⭐' : '·'}
      </span>
      <span className="text-[10px] text-[#6A6A6A] mt-0.5">{s.pct}%</span>
    </div>
  );
}

function TrophyBadge({ trophy }: { trophy: Trophy }) {
  const g = { gender: 'f' as const };
  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all"
      style={{
        background: trophy.earned ? '#FFF3D6' : '#F5EFE6',
        border:     `2px solid ${trophy.earned ? '#FFD78A' : '#E0DACE'}`,
        opacity:    trophy.earned ? 1 : 0.55,
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
    </div>
  );
}
