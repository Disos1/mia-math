/**
 * The ahead banner must reach the screen, not just the plan.
 *
 * The composer tests proved pre-teaching items carried `ahead: true`; the live
 * session showed no banner, because the block opened with a worked example and
 * only the practice view drew banners. Test what she SEES on the first screen of
 * the block.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MasteryMap, MasteryRecord, GapProfile } from '../../types';
import { composeSession } from '../../lib/sessionComposer';
import { STRANDS } from '../../lib/curriculum/hashbacha4';
import { estimateUnit, type ClassPosition } from '../../lib/curriculum/classPosition';
import { WorkedExampleView } from '../../routes/Session';
import { BlockBanners } from './BlockBanners';
import { t } from '../../i18n/t';

const r = (s: string, st: MasteryRecord['status'], a: number, n: number): MasteryRecord => ({
  profileId: 'p', skillCode: s, status: st, firstAttemptAccuracy: a, itemCount: n,
  sessionCount: 10, lastPracticedAt: '2026-09-07T00:00:00.000Z',
  needsRetentionProbe: false, retentionProbeDueAt: null,
});

const MIA: MasteryMap = {
  ARITH_MULT_6_9:         r('ARITH_MULT_6_9',         'שליטה',  0.9, 943),
  ARITH_SUB_REGROUP_ZERO: r('ARITH_SUB_REGROUP_ZERO', 'בתהליך', 0.7, 798),
  FRAC_COMPARE_UNIT:      r('FRAC_COMPARE_UNIT',      'שליטה',  1.0,  42),
  FRAC_OF_QUANTITY:       r('FRAC_OF_QUANTITY',       'בתהליך', 0.3, 323),
  PLACE_VALUE_TO_MILLION: r('PLACE_VALUE_TO_MILLION', 'שליטה',  0.9,  41),
};

const GAP = {
  version: 1, computedAt: '2026-07-09T15:29:59.860Z', diagnosticSessionId: 'x',
  strands: {}, cpaStartLayer: {},
  sessionComposerNotes: { startWith: 'easy_known_skill', firstNewMaterial: 'ARITH_SUB_REGROUP_ZERO', blockedPracticePriority: [] },
} as unknown as GapProfile;

const NOW = '2026-09-19T12:00:00.000Z';
const position: ClassPosition = {
  units:  Object.fromEntries(STRANDS.map(s => [s, estimateUnit(s, NOW).id])),
  source: Object.fromEntries(STRANDS.map(s => [s, 'estimate' as const])),
};

const AHEAD_TITLE = t('session.ahead_title', { gender: 'f' });

describe('ahead-of-class banner reaches the screen', () => {
  // Find a session that pre-teaches, and the first item of its ahead block.
  const firstAhead = [0, 1, 2, 3]
    .map(k => composeSession({
      profileId: 'p', gapProfile: GAP, masteryMap: MIA, mode: 'quantity',
      sessionsCompleted: k, rng: () => 0.5, now: NOW, targetGrade: 4, classPosition: position,
    }).plannedItems.find(p => p.ahead))
    .find(Boolean);

  it('a pre-teaching block exists and opens with a worked example (new to her)', () => {
    expect(firstAhead).toBeDefined();
    expect(firstAhead!.isWorkedExample).toBe(true);
  });

  it('shows the banner on that worked example', () => {
    const html = renderToStaticMarkup(
      <WorkedExampleView planItem={firstAhead!} gender="f" onDone={() => {}} />,
    );
    expect(html).toContain(AHEAD_TITLE);
  });

  it('does not show it on ordinary items', () => {
    const plain = { ...firstAhead!, ahead: undefined };
    expect(renderToStaticMarkup(<BlockBanners planItem={plain} />)).not.toContain(AHEAD_TITLE);
  });
});
