import { useMemo } from 'react';
import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import type { Profile, StrandCode } from '../types';
import { loadSessionRecords } from '../lib/sessionStore';

interface Props {
  profile: Profile | null;
  onBack:  () => void;
  onReset: () => void;
}

/**
 * Parent dashboard — Phase 2 cut.
 *
 * Shows:
 *   - Total questions answered + correct + accuracy
 *   - 7-day activity strip (which days Mia practiced)
 *   - Diagnostic strand status + active error patterns
 *   - First skill focus
 */
export function Parent({ profile, onBack, onReset }: Props) {
  const g = { gender: 'f' as const };

  const handleReset = () => {
    if (confirm(t('parent.reset_confirm', g))) onReset();
  };

  const diagDateHe = profile?.diagnosticCompletedAt
    ? new Date(profile.diagnosticCompletedAt).toLocaleDateString('he-IL')
    : '';

  // ── Aggregate session stats ─────────────────────────────────────────────────

  const sessions = useMemo(
    () => (profile ? loadSessionRecords(profile.profileId) : []),
    [profile?.profileId, profile?.sessionsCompleted]  // re-read when count changes
  );

  const totalAnswered = sessions.reduce((s, r) => s + r.itemsAttempted, 0);
  const totalCorrect  = sessions.reduce((s, r) => s + r.itemsCorrect,  0);
  const accuracy      = totalAnswered > 0
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : null;

  // ── 7-day activity strip ────────────────────────────────────────────────────
  // Build an array of the last 7 calendar days (index 0 = oldest, 6 = today).
  // For each day mark whether a session completed on that date.

  const activityDays = useMemo(() => {
    const today = new Date();
    // Collect all unique practice dates (local YYYY-MM-DD)
    const practicedDates = new Set(
      sessions
        .filter(s => s.completedAt)
        .map(s => toLocalDate(s.completedAt!))
    );

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));  // 6 days ago → today
      const dateStr = toLocalDate(d.toISOString());
      const dayLabel = d.toLocaleDateString('he-IL', { weekday: 'short' })
                        .replace('׳', '');   // trim the Hebrew geresh
      return { dateStr, dayLabel, practiced: practicedDates.has(dateStr) };
    });
  }, [sessions]);

  const gap = profile?.gapProfileJson ?? null;

  return (
    <div className="min-h-screen p-6 fade-in" style={{ background: '#F8F4ED' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-2xl" aria-label="חזרה">→</button>
            <h2 className="text-2xl font-bold">{t('parent.title', g)}</h2>
          </div>
          <button onClick={handleReset} className="text-sm text-red-500 underline">
            {t('parent.reset_demo', g)}
          </button>
        </div>

        {!gap && (
          <div className="bg-white card-shadow rounded-3xl p-8 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-600">{t('parent.no_diagnostic', g)}</p>
          </div>
        )}

        {gap && profile && (
          <div className="flex flex-col gap-4">

            {/* ── Summary header ─────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <p className="text-sm text-gray-500">
                {t('parent.diag_completed', { ...g, date: diagDateHe })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {t('parent.sessions_count', { ...g, count: profile.sessionsCompleted })}
              </p>
            </div>

            {/* ── Aggregate stats ────────────────────────────────────────── */}
            {totalAnswered > 0 && (
              <div className="bg-white card-shadow rounded-3xl p-5">
                <div className="text-sm font-medium text-gray-500 mb-3">
                  {t('parent.stats_title', g)}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <StatPill
                    value={totalAnswered}
                    label={t('parent.stat_answered', g)}
                    color="#C4A7E7"
                  />
                  <StatPill
                    value={totalCorrect}
                    label={t('parent.stat_correct', g)}
                    color="#B8E5C9"
                  />
                  <StatPill
                    value={accuracy !== null ? `${accuracy}%` : '—'}
                    label={t('parent.stat_accuracy', g)}
                    color="#FF9B7A"
                  />
                </div>
              </div>
            )}

            {/* ── 7-day activity strip ───────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <div className="text-sm font-medium text-gray-500 mb-3">
                {t('parent.streak_title', g)}
              </div>
              <div className="flex justify-between gap-1">
                {activityDays.map(({ dateStr, dayLabel, practiced }) => (
                  <div key={dateStr} className="flex flex-col items-center gap-1.5 flex-1">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background:  practiced ? '#C4A7E7' : '#EDE8E0',
                        color:       practiced ? '#2D3047' : '#A0968A',
                      }}
                      title={practiced
                        ? t('parent.streak_practiced', g)
                        : t('parent.streak_no_practice', g)}
                    >
                      {practiced ? '✓' : ''}
                    </div>
                    <span className="text-xs text-gray-500 text-center leading-tight">
                      {dayLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Strand status ──────────────────────────────────────────── */}
            <div className="bg-white card-shadow rounded-3xl p-5">
              <div className="text-sm font-medium text-gray-500 mb-3">
                {t('parent.strands_title', g)}
              </div>
              {(Object.entries(gap.strands) as [StrandCode, typeof gap.strands[StrandCode]][])
                .sort(([, a], [, b]) => (a?.priority ?? 99) - (b?.priority ?? 99))
                .map(([strandCode, strandStatus]) => {
                  if (!strandStatus) return null;
                  const isGap = strandStatus.status === 'בתהליך';
                  return (
                    <div key={strandCode} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{isGap ? '🌱' : '✅'}</span>
                        <span className="font-bold text-lg">
                          {t(`strand.${strandCode}` as LocaleKey, g)}
                        </span>
                        <span className="text-sm text-gray-500 mr-auto">
                          {t(`mastery.${strandStatus.status}` as LocaleKey, g)}
                        </span>
                      </div>
                      {strandStatus.activeErrors.length > 0 && (
                        <div className="mt-2 mr-7">
                          <div className="text-xs text-gray-500 mb-1">
                            {t('parent.active_errors', g)}
                          </div>
                          {strandStatus.activeErrors.map(err => (
                            <div key={err} className="text-sm">
                              · {t(`err.${err}` as LocaleKey, g)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* ── First focus ────────────────────────────────────────────── */}
            {gap.sessionComposerNotes.firstNewMaterial && (
              <div className="bg-white card-shadow rounded-3xl p-5">
                <div className="text-sm font-medium text-gray-500 mb-2">
                  {t('parent.first_focus', g)}
                </div>
                <div className="text-lg font-bold">
                  {t(`skill.${gap.sessionComposerNotes.firstNewMaterial}` as LocaleKey, g)}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Convert an ISO timestamp to a local YYYY-MM-DD string */
function toLocalDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatPill({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-3 flex flex-col items-center gap-1"
      style={{ background: `${color}33` }}   // 20% opacity tint
    >
      <span className="text-2xl font-bold" style={{ color: '#2D3047' }}>
        {value}
      </span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}
