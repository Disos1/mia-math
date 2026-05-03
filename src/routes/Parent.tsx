import { useMemo, useState } from 'react';
import { t } from '../i18n/t';
import type { LocaleKey } from '../i18n/t';
import type { Gender } from '../i18n/t';
import type { Profile, StrandCode } from '../types';
import { loadSessionRecords } from '../lib/sessionStore';
import { loadMasteryMap } from '../lib/sessionStore';

interface Props {
  profile: Profile | null;
  onBack:  () => void;
  onReset: () => void;
}

export function Parent({ profile, onBack, onReset }: Props) {
  const gender    = (profile?.gender ?? 'f') as Gender;
  const childName = profile?.displayName ?? '';
  const g = { gender, name: childName };

  const [showResetModal, setShowResetModal] = useState(false);

  const diagDateHe = profile?.diagnosticCompletedAt
    ? new Date(profile.diagnosticCompletedAt).toLocaleDateString('he-IL')
    : '';

  // ── Aggregate session stats ─────────────────────────────────────────────────

  const sessions = useMemo(
    () => (profile ? loadSessionRecords(profile.profileId) : []),
    [profile?.profileId, profile?.sessionsCompleted]
  );

  // Include all sessions with at least one answered question (completedAt may be null for partial)
  const countableSessions = useMemo(
    () => sessions.filter(s => s.itemsAttempted > 0),
    [sessions]
  );

  const totalAnswered = countableSessions.reduce((s, r) => s + r.itemsAttempted, 0);
  const totalCorrect  = countableSessions.reduce((s, r) => s + r.itemsCorrect,  0);
  const accuracy      = totalAnswered > 0
    ? Math.round((totalCorrect / totalAnswered) * 100)
    : null;

  // ── 7-day activity strip ────────────────────────────────────────────────────

  const activityDays = useMemo(() => {
    const today = new Date();

    // Group sessions by local date — include partial sessions (completedAt may be null)
    const byDate = new Map<string, typeof sessions>();
    countableSessions.forEach(s => {
      // Use completedAt if available, else startedAt as the day bucket
      const ts = s.completedAt ?? s.startedAt;
      const d  = toLocalDate(ts);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(s);
    });

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr      = toLocalDate(d.toISOString());
      const dayLabel     = d.toLocaleDateString('he-IL', { weekday: 'short' }).replace('׳', '');
      const daySessions  = byDate.get(dateStr) ?? [];
      const answered     = daySessions.reduce((s, r) => s + r.itemsAttempted, 0);
      const correct      = daySessions.reduce((s, r) => s + r.itemsCorrect,   0);
      const dayAccuracy  = answered > 0 ? Math.round(correct / answered * 100) : null;
      const hasPartial   = daySessions.some(s => !s.completedAt);
      const hasComplete  = daySessions.some(s => !!s.completedAt);
      return { dateStr, dayLabel, practiced: daySessions.length > 0, answered, accuracy: dayAccuracy, hasPartial, hasComplete };
    });
  }, [countableSessions]);

  // ── Live mastery map (active skills) ───────────────────────────────────────

  const masteryMap = useMemo(
    () => (profile ? loadMasteryMap(profile.profileId) : {}),
    [profile?.profileId, profile?.sessionsCompleted]
  );

  const activeSkills = useMemo(
    () => Object.entries(masteryMap)
      .filter(([, r]) => r.status === 'בתהליך')
      .sort(([, a], [, b]) =>
        (b.lastPracticedAt ?? '').localeCompare(a.lastPracticedAt ?? '')
      )
      .slice(0, 5),
    [masteryMap]
  );

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
          <button
            onClick={() => setShowResetModal(true)}
            className="text-sm text-red-400 underline"
          >
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
              <div className="flex gap-1.5">
                {activityDays.map(({ dateStr, dayLabel, practiced, answered, accuracy: dayAcc, hasPartial, hasComplete }) => {
                  const accuracyColor =
                    dayAcc === null   ? '#9CA3AF'
                    : dayAcc >= 80   ? '#16A34A'
                    : dayAcc >= 60   ? '#D97706'
                    :                  '#DC2626';
                  const bg = !practiced ? '#F9F8F6'
                    : hasComplete      ? '#F3EEFF'
                    :                    '#FFF9EF'; // partial-only = warm tint
                  const labelColor = !practiced ? '#9CA3AF'
                    : hasComplete      ? '#7C3AED'
                    :                    '#D97706';
                  return (
                    <div
                      key={dateStr}
                      className="flex-1 rounded-xl py-2 px-1 flex flex-col items-center gap-1"
                      style={{ background: bg }}
                    >
                      <span className="text-xs font-semibold" style={{ color: labelColor }}>
                        {dayLabel}
                      </span>
                      {practiced ? (
                        <>
                          <span className="text-sm font-bold text-[#2D3047] leading-none">
                            {answered}
                          </span>
                          <span className="text-xs font-medium leading-none" style={{ color: accuracyColor }}>
                            {dayAcc}%
                          </span>
                          {hasPartial && !hasComplete && (
                            <span className="text-[9px] text-amber-500 leading-none">
                              {t('parent.session_partial', g)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-300 text-lg leading-none">·</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-1">
                <span className="text-xs text-gray-400">שאלות / דיוק</span>
              </div>
            </div>

            {/* ── Active skills from live mastery ───────────────────────── */}
            {activeSkills.length > 0 && (
              <div className="bg-white card-shadow rounded-3xl p-5">
                <div className="text-sm font-medium text-gray-500 mb-3">
                  {t('parent.active_skills', g)}
                </div>
                {activeSkills.map(([skillCode, record]) => {
                  const acc = record.firstAttemptAccuracy > 0
                    ? `${Math.round(record.firstAttemptAccuracy * 100)}%`
                    : null;
                  return (
                    <div
                      key={skillCode}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🌱</span>
                        <span className="text-sm text-[#2D3047]">
                          {t(`skill.${skillCode}` as LocaleKey, g)}
                        </span>
                      </div>
                      {acc && (
                        <span className="text-xs text-gray-400">{acc}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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

      {/* ── Reset confirmation modal ────────────────────────────────────────── */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          dir="rtl"
        >
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
            <div className="text-5xl mb-4">⚠️</div>
            <h3 className="text-xl font-bold text-[#2D3047] mb-3">
              {t('parent.reset_demo', g)}
            </h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {t('parent.reset_modal_body', g)}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowResetModal(false); onReset(); }}
                className="bg-red-500 text-white rounded-2xl py-3 font-bold text-base"
              >
                {t('parent.reset_modal_confirm', g)}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                className="bg-gray-100 text-gray-600 rounded-2xl py-3 font-bold text-base"
              >
                {t('parent.reset_modal_cancel', g)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
      style={{ background: `${color}33` }}
    >
      <span className="text-2xl font-bold" style={{ color: '#2D3047' }}>
        {value}
      </span>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
}
