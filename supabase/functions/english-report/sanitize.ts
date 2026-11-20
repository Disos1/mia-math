/**
 * Validation for the one-way summary the Mia English app sends.
 * Pure (no Deno APIs) so it is unit-tested in src/lib/englishReport.test.ts.
 *
 * Only whitelisted fields survive, numbers are clamped integers, and the
 * "hard words" must be plain English words from a fixed shape. Anything else
 * is dropped — the email renders this object, so it must never carry markup.
 */

export interface EnglishSummary {
  day: string;
  words: { total: number; sure: number; once: number; learning: number; unseen: number };
  hard: string[];
  today: { minutes: number; sessions: number; scored: number; correct: number; stars: number };
  mock: { score: number; day: string } | null;
  banks: { sentences: [number, number]; rules: [number, number]; decode: [number, number] };
  build: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const WORD = /^[A-Za-z]{1,20}$/;

function int(v: unknown, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.round(n)));
}

function pair(v: unknown): [number, number] {
  const a = Array.isArray(v) ? v : [];
  const total = int(a[1], 500);
  return [Math.min(int(a[0], 500), total), total];
}

export function sanitizeSummary(raw: unknown): EnglishSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, any>;
  if (typeof r.day !== 'string' || !DAY.test(r.day)) return null;
  const w = r.words ?? {};
  const t = r.today ?? {};
  const b = r.banks ?? {};
  const words = {
    total: int(w.total, 200), sure: int(w.sure, 200), once: int(w.once, 200),
    learning: int(w.learning, 200), unseen: int(w.unseen, 200),
  };
  if (words.total === 0) return null;
  const hard = (Array.isArray(r.hard) ? r.hard : [])
    .filter((x: unknown) => typeof x === 'string' && WORD.test(x))
    .slice(0, 12);
  const scored = int(t.scored, 5000);
  const mock = r.mock && typeof r.mock === 'object' && typeof r.mock.day === 'string' && DAY.test(r.mock.day)
    ? { score: int(r.mock.score, 100), day: r.mock.day }
    : null;
  return {
    day: r.day,
    words,
    hard,
    today: {
      minutes: int(t.minutes, 600),
      sessions: int(t.sessions, 50),
      scored,
      correct: Math.min(int(t.correct, 5000), scored),
      stars: int(t.stars, 200),
    },
    mock,
    banks: { sentences: pair(b.sentences), rules: pair(b.rules), decode: pair(b.decode) },
    build: typeof r.build === 'string' ? r.build.replace(/[^\w.-]/g, '').slice(0, 20) : '',
  };
}

/** Israel calendar day for an instant (the email's reporting zone). */
export function israelDay(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** The tablet's clock may be a little off; accept yesterday..tomorrow only. */
export function dayInWindow(day: string, now: Date = new Date()): boolean {
  const today = Date.parse(`${israelDay(now)}T12:00:00Z`);
  const d = Date.parse(`${day}T12:00:00Z`);
  return Number.isFinite(d) && Math.abs(d - today) <= 36 * 3600 * 1000;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
