import { describe, expect, it } from 'vitest';
import { dayInWindow, israelDay, sanitizeSummary } from '../../supabase/functions/english-report/sanitize';
import { englishSection } from '../../supabase/functions/daily-summary/english';
import emailSource from '../../supabase/functions/daily-summary/index.ts?raw';
import receiverSource from '../../supabase/functions/english-report/index.ts?raw';

const good = {
  day: '2026-11-21',
  words: { total: 64, sure: 0, once: 58, learning: 6, unseen: 0 },
  hard: ['scissors', 'Wednesday'],
  today: { minutes: 27.4, sessions: 1, scored: 40, correct: 34, stars: 3 },
  mock: null,
  banks: { sentences: [20, 48], rules: [10, 23], decode: [5, 64] },
  build: '2026-11-20',
};

describe('english-report sanitize', () => {
  it('keeps a well-formed summary and rounds numbers', () => {
    const s = sanitizeSummary(good)!;
    expect(s.today.minutes).toBe(27);
    expect(s.words.once).toBe(58);
    expect(s.hard).toEqual(['scissors', 'Wednesday']);
    expect(s.banks.sentences).toEqual([20, 48]);
  });

  it('drops markup, unknown fields and impossible numbers', () => {
    const s = sanitizeSummary({
      ...good,
      hard: ['<img src=x>', 'ok', 'a b', 42],
      today: { ...good.today, correct: 999, scored: 10 },
      banks: { sentences: [99, 5] },
      evil: '<script>',
      build: '<b>x</b>',
    })!;
    expect(s.hard).toEqual(['ok']);
    expect(s.today.correct).toBe(10);
    expect(s.banks.sentences).toEqual([5, 5]);
    expect(s.banks.rules).toEqual([0, 0]);
    expect((s as any).evil).toBeUndefined();
    expect(s.build).toBe('bxb');
  });

  it('rejects summaries without a day or words', () => {
    expect(sanitizeSummary(null)).toBeNull();
    expect(sanitizeSummary({ ...good, day: 'today' })).toBeNull();
    expect(sanitizeSummary({ ...good, words: {} })).toBeNull();
  });

  it('accepts only yesterday..tomorrow in Israel time', () => {
    const now = new Date('2026-11-21T10:00:00Z');
    expect(israelDay(now)).toBe('2026-11-21');
    expect(dayInWindow('2026-11-21', now)).toBe(true);
    expect(dayInWindow('2026-11-20', now)).toBe(true);
    expect(dayInWindow('2026-11-22', now)).toBe(true);
    expect(dayInWindow('2026-11-18', now)).toBe(false);
  });
});

describe('english section of the daily email', () => {
  it('is empty without a report, so the math email is unchanged', () => {
    expect(englishSection(null, '2026-11-21')).toBe('');
  });

  it('shows today, words, banks and hard words', () => {
    const html = englishSection({ report_day: '2026-11-21', summary: sanitizeSummary(good) }, '2026-11-21');
    expect(html).toContain('אנגלית — הכנה למבחן');
    expect(html).toContain('27 דק׳');
    expect(html).toContain('דיוק 85%');
    expect(html).toContain('58/64');
    expect(html).toContain('scissors, Wednesday');
    expect(html).toContain('משפטים 20/48');
  });

  it('says when English was not practised on the report day', () => {
    const html = englishSection({ report_day: '2026-11-21', summary: sanitizeSummary(good) }, '2026-11-22');
    expect(html).toContain('לא נרשם תרגול באנגלית');
    expect(html).not.toContain('27 דק׳');
  });

  it('shows the latest mock score', () => {
    const html = englishSection({ report_day: '2026-11-22', summary: sanitizeSummary({ ...good, day: '2026-11-22', mock: { score: 94, day: '2026-11-22' } }) }, '2026-11-22');
    expect(html).toContain('מבחן ניסיון אחרון (2026-11-22): <strong>94</strong>');
  });

  it('escapes anything that slipped into the stored JSON', () => {
    const html = englishSection({ report_day: '2026-11-21', summary: { ...good, hard: ['<b>x</b>'] } }, '2026-11-21');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('seams', () => {
  it('the email reads english_reports and passes the row into buildEmail', () => {
    expect(emailSource).toContain(".from('english_reports')");
    expect(emailSource).toContain('englishRow ?? null');
    expect(emailSource).toContain('${englishSection(englishRow, reportDate)}');
  });

  it('the receiver authenticates by key hash and stores the sanitized summary', () => {
    expect(receiverSource).toContain(".from('english_report_keys')");
    expect(receiverSource).toContain('sanitizeSummary(body?.summary)');
    expect(receiverSource).toContain(".from('english_reports').upsert(");
  });
});
