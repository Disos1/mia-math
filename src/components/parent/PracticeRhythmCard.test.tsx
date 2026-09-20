/**
 * The week at a glance — counting DAYS, and counting unfinished sessions.
 *
 * Her real record for 2–20 September: two days of practice, then nothing. That
 * is the case this card exists to make visible.
 */

import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SessionRecord } from '../../types';
import { PracticeRhythmCard } from './PracticeRhythmCard';
import { summariseRhythm, WEEKLY_GOAL_DAYS } from '../../lib/practiceRhythm';

const rec = (startedAt: string, attempted: number, completed = true): SessionRecord => ({
  sessionId: startedAt + attempted, profileId: 'p', mode: 'quantity',
  startedAt, completedAt: completed ? startedAt : null,
  itemsAttempted: attempted, itemsCorrect: Math.round(attempted * 0.7), primarySkillCode: 'X',
});

const NOW = '2026-09-20T18:00:00.000Z';

describe('summariseRhythm', () => {
  it('counts days, not sessions — three sittings in one day is one day', () => {
    const r = summariseRhythm([
      rec('2026-09-20T08:00:00.000Z', 6), rec('2026-09-20T12:00:00.000Z', 5), rec('2026-09-20T17:00:00.000Z', 4),
    ], NOW);
    expect(r.days).toBe(1);
    expect(r.questions).toBe(15);
  });

  it('counts a session she never finished', () => {
    // She runs out of time often; that was still practice.
    expect(summariseRhythm([rec('2026-09-19T08:00:00.000Z', 7, false)], NOW).days).toBe(1);
  });

  it('ignores a session with nothing answered', () => {
    expect(summariseRhythm([rec('2026-09-19T08:00:00.000Z', 0, false)], NOW).days).toBe(0);
  });

  it('reports the gap since her last practice', () => {
    // Her real state on 20 September: last practised on the 7th.
    expect(summariseRhythm([rec('2026-09-07T08:00:00.000Z', 20)], NOW).daysSince).toBe(13);
  });

  it('is empty, not broken, before she has ever practised', () => {
    expect(summariseRhythm([], NOW)).toMatchObject({ days: 0, questions: 0, daysSince: null });
  });
});

describe('the card', () => {
  it('shows the shortfall when the week is thin', () => {
    const html = renderToStaticMarkup(
      <PracticeRhythmCard records={[rec('2026-09-19T08:00:00.000Z', 12)]} now={NOW} />);
    expect(html).toContain(`מתוך ${WEEKLY_GOAL_DAYS}`);
    expect(html).toContain('10 דקות ביום');      // the nudge, only when short
  });

  it('drops the nudge once she has met the goal', () => {
    const week = ['16', '17', '18', '19'].map(d => rec(`2026-09-${d}T08:00:00.000Z`, 10));
    expect(renderToStaticMarkup(<PracticeRhythmCard records={week} now={NOW} />))
      .not.toContain('10 דקות ביום');
  });
});
