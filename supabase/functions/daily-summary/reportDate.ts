// Explicit report-zone helpers shared by grouping, query bounds and display.
export const REPORT_TIME_ZONE = 'Asia/Jerusalem';

export function reportDay(instant: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(instant));
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function shiftDay(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayLabel(day: string, weekdayOnly = false): string {
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'UTC', weekday: weekdayOnly ? 'short' : 'long',
    ...(weekdayOnly ? {} : { day: 'numeric', month: 'long', year: 'numeric' } as const),
  }).format(new Date(`${day}T12:00:00Z`));
}

// Resolve local midnight, including Israel's winter/summer and DST transition days.
export function dayStartIso(day: string): string {
  const target = Date.parse(`${day}T00:00:00Z`);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: REPORT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let i = 0; i < 3; i++) {
    const parts = formatter.formatToParts(new Date(candidate));
    const part = (type: string) => parts.find(p => p.type === type)!.value;
    const localAsUtc = Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`);
    const delta = target - localAsUtc;
    candidate += delta;
    if (delta === 0) break;
  }
  return new Date(candidate).toISOString();
}
