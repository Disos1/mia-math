import { describe, it, expect } from 'vitest';
import { reportDay, shiftDay, dayLabel, dayStartIso } from '../../supabase/functions/daily-summary/reportDate';
import source from '../../supabase/functions/daily-summary/index.ts?raw';

describe('daily email Israel report date', () => {
  it('uses the Israel day across UTC midnight boundaries in winter and summer', () => {
    expect(reportDay('2026-11-13T21:59:59Z')).toBe('2026-11-13');
    expect(reportDay('2026-11-13T22:23:54Z')).toBe('2026-11-14');
    expect(reportDay('2026-07-01T21:00:00Z')).toBe('2026-07-02');
  });
  it('resolves winter, summer and DST transition local midnight', () => {
    expect(dayStartIso('2026-11-14')).toBe('2026-11-13T22:00:00.000Z');
    expect(dayStartIso('2026-07-02')).toBe('2026-07-01T21:00:00.000Z');
    expect(dayStartIso('2026-03-27')).toBe('2026-03-26T22:00:00.000Z');
    expect(dayStartIso('2026-03-28')).toBe('2026-03-27T21:00:00.000Z');
    expect(dayStartIso('2026-10-25')).toBe('2026-10-24T21:00:00.000Z');
    expect(dayStartIso('2026-10-26')).toBe('2026-10-25T22:00:00.000Z');
  });
  it('shifts calendar dates without DST drift and labels the same day', () => {
    expect(shiftDay('2026-11-01', -7)).toBe('2026-10-25');
    expect(shiftDay('2027-01-01', -1)).toBe('2026-12-31');
    expect(dayLabel('2026-11-14')).toContain('שבת');
    expect(dayLabel('2026-11-14')).toContain('14');
  });
  it('keeps every local midnight boundary consistent throughout the year', () => {
    for (let i = 0; i < 365; i++) {
      const day = shiftDay('2026-01-01', i);
      const start = dayStartIso(day);
      expect(reportDay(start)).toBe(day);
      expect(reportDay(new Date(Date.parse(start) - 1))).toBe(shiftDay(day, -1));
    }
  });
  it('uses a fixed dated report instead of delivery-relative today wording', () => {
    expect(source).not.toContain('תרגלה היום');
    expect(source).not.toContain('✅ היום');
    expect(source).toContain('עד הפקת הדוח');
    expect(source).toContain('buildDayStrip(sessions7d, reportDate)');
    expect(source).toContain(".gte('started_at', dayStartIso(fourteenAgo))");
    expect(source).toContain(".gte('created_at', dayStartIso(sevenAgo))");
  });
});
