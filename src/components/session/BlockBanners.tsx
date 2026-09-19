/**
 * The "why this block" banners, shown once at the start of a block.
 *
 * One component for every view that can open a block. They used to live inline
 * in the practice view only — and a block that opens with a worked example
 * renders a different view, so the banner silently never appeared. Pre-teaching
 * material is new to her by definition, so it ALWAYS opens with a worked
 * example: the "ahead of the class" banner was unreachable exactly where it
 * mattered (found in the live session, 2026-09-19).
 */

import type { SessionPlanItem } from '../../types';
import { t } from '../../i18n/t';

export function BlockBanners({ planItem }: { planItem: SessionPlanItem }) {
  return (
    <>
      {/* Ahead-of-class banner. Pre-teaching only pays off emotionally if she
          KNOWS she is ahead — arriving in class already knowing the answer is
          the win for a child who believes she is "not a math person". */}
      {planItem.ahead && (
        <div className="bg-[#F3EEFF] border border-[#C4A7E7] rounded-2xl px-4 py-3 fade-in text-center">
          <div className="text-sm font-bold text-[#7C3AED]">🚀 {t('session.ahead_title', { gender: 'f' })}</div>
          <div className="text-xs text-[#2D3047] mt-1 leading-relaxed">{t('session.ahead_body', { gender: 'f' })}</div>
        </div>
      )}

      {/* Tools-for-today banner.
          Prerequisite items are easier than her grade level, and a child who
          knows she is behind reads "easier" as demotion unless told why. The
          graph edge supplies the reason, so the block arrives as equipment for
          the thing she is actually trying to do. */}
      {planItem.track === 'prerequisite' && planItem.prereqWhy && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-4 py-3 fade-in">
          <div className="text-xs font-bold text-[#1D4ED8] mb-1">
            🧰 {t('session.prereq_title', { gender: 'f' })}
          </div>
          <div className="text-sm text-[#2D3047] leading-relaxed">
            {planItem.prereqWhy}
          </div>
        </div>
      )}
    </>
  );
}
