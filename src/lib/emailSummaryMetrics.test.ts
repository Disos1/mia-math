import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import source from '../../supabase/functions/daily-summary/index.ts?raw';
import * as dates from '../../supabase/functions/daily-summary/reportDate';
import * as english from '../../supabase/functions/daily-summary/english';

// Exercise the actual Deno email builder without starting its handler or sending email.
const exports: Record<string, unknown> = {};
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('exports', 'require', 'Deno', js)(exports,
  (name: string) => name === './reportDate.ts' ? dates : name === './english.ts' ? english : {
    createClient() { throw new Error('Network access is forbidden in render tests'); },
  }, { serve() { /* Register nothing: render-only test. */ } });
const buildEmail = exports.buildEmail as (...args: unknown[]) => { subject: string; html: string };
const attempts = (code: string, count: number, correct: number) =>
  Array.from({ length: count }, (_, i) => ({ skill_code: code, correct: i < correct }));

describe('daily email distinguishes period scores from stored mastery', () => {
  it('labels the current-period ratio separately from the stored abstract score', () => {
    const { html } = buildEmail('Test learner', [], [], [
      { skill_code: 'TEST_A', status: 'בתהליך', item_count: 12, first_attempt_accuracy: 0.5 },
    ], null, null, attempts('TEST_A', 6, 2), '2024-01-10');
    expect(html).toContain('בתקופת הדוח: 2 מתוך 6 (33%)');
    expect(html).toContain('מדד השליטה השמור, בתרגול מספרי ללא המחשה: 50%');
    expect(html).toContain('כל סוגי התרגול');
    expect(html).toContain('2024-01-03 עד 2024-01-10, כולל');
  });
  it('does not imply that a low period score earned a mastery status', () => {
    const { html } = buildEmail('Test learner', [], [], [
      { skill_code: 'TEST_B', status: 'שליטה', item_count: 30, first_attempt_accuracy: '0.9' },
    ], null, null, attempts('TEST_B', 12, 7), '2024-01-10');
    expect(html).toContain('בתקופה: 7 מתוך 12');
    expect(html).toContain('סטטוס שמור: שליטה (מדד שליטה 90%)');
    expect(html).toContain('גם מתאריכים קודמים לתקופה');
  });
  it('does not fabricate a stored percentage when it is missing', () => {
    const { html } = buildEmail('Test learner', [], [], [
      { skill_code: 'TEST_C', status: 'שליטה', item_count: 30 },
    ], null, null, attempts('TEST_C', 3, 3), '2024-01-10');
    expect(html).toContain('סטטוס שמור: שליטה');
    expect(html).not.toContain('מדד שליטה 0%');
    expect(html).not.toContain('NaN');
  });
});

describe('daily email distinguishes zero correct from no attempts', () => {
  const session = (correct: number, answered = 4, completed = true) => ({
    started_at: '2024-01-10T08:00:00Z',
    completed_at: completed ? '2024-01-10T08:10:00Z' : null,
    items_answered: answered,
    items_correct: correct,
  });
  it('renders 0% in the period card and daily strip, with a valid decline trend', () => {
    const { html } = buildEmail('Test learner', [session(0)], [session(0)], [], null, 80, [], '2024-01-10');
    expect(html.match(/>0%<\/div>/g)).toHaveLength(2);
    expect(html).toContain('↓ ירידה לעומת התקופה הקודמת (80%)');
    expect(html).not.toContain('NaN');
  });
  it('also renders 0% for partial practice and a stable zero-to-zero trend', () => {
    const { html } = buildEmail('Test learner', [session(0, 4, false)], [], [], null, 0, [], '2024-01-10');
    expect(html.match(/>0%<\/div>/g)).toHaveLength(2);
    expect(html).toContain('(חלקי)');
    expect(html).toContain('→ יציב לעומת התקופה הקודמת (0%)');
  });
  it.each([{ sessions: [] }, { sessions: [session(0, 0)] }])('does not invent a percentage or trend when no questions were answered', ({ sessions }) => {
    const { html } = buildEmail('Test learner', sessions, [], [], null, 80, [], '2024-01-10');
    expect(html).toContain('>—</div>');
    expect(html).not.toContain('>0%</div>');
    expect(html).not.toContain('לעומת התקופה הקודמת');
    expect(html).not.toContain('NaN');
  });
  it('preserves nonzero percentages and does not invent a missing comparison', () => {
    const { html } = buildEmail('Test learner', [session(2)], [], [], null, null, [], '2024-01-10');
    expect(html.match(/>50%<\/div>/g)).toHaveLength(2);
    expect(html).not.toContain('לעומת התקופה הקודמת');
  });
});

describe('daily email English exam-prep section', () => {
  const row = { report_day: '2024-01-10', summary: {
    day: '2024-01-10', words: { total: 64, sure: 30, once: 30, learning: 4, unseen: 0 }, hard: ['scissors'],
    today: { minutes: 25, sessions: 1, scored: 50, correct: 45, stars: 3 }, mock: null,
    banks: { sentences: [10, 48], rules: [5, 23], decode: [0, 64] }, build: 't' } };
  it('appears in the real email only when a report row is passed', () => {
    const withIt = buildEmail('Test learner', [], [], [], null, null, [], '2024-01-10', row).html;
    const without = buildEmail('Test learner', [], [], [], null, null, [], '2024-01-10').html;
    expect(withIt).toContain('אנגלית — הכנה למבחן');
    expect(withIt).toContain('60/64');
    expect(without).not.toContain('אנגלית');
  });
});
