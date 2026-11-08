// @vitest-environment jsdom
/**
 * Worked-example and ladder lines must put the answer IN the blank.
 * Appending it after "36 ÷ 9 = ?" made RTL draw "4 36 ÷ 9 = ?" (2026-11-09).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { teachLine } from './Session';
import { MathText } from '../components/primitives/MathText';
import { t } from '../i18n/t';

afterEach(cleanup);

describe('teachLine', () => {
  it('fills a trailing "= ?" blank', () => {
    expect(teachLine('36 ÷ 9 = ?', 4)).toBe('36 ÷ 9 = 4');
    expect(teachLine('קודם 56 − 4 = ?', 52)).toBe('קודם 56 − 4 = 52');
  });

  it('fills a missing-factor blank', () => {
    expect(teachLine('7 × ? = 42', 6)).toBe('7 × 6 = 42');
  });

  it('formats a big answer the way the question does', () => {
    expect(teachLine('25 × 1,000 = ?', 25000)).toBe('25 × 1,000 = 25,000');
  });

  it('turns "כמה זה" into an equation and keeps the column label', () => {
    expect(teachLine('כמה זה 13 − 8?', 5)).toBe('13 − 8 = 5');
    expect(teachLine('עשרות: כמה זה 9 − 4?', 5)).toBe('עשרות: 9 − 4 = 5');
  });

  it('leaves a plain Hebrew question mark alone and appends', () => {
    expect(teachLine('כמה ספרות יש ב-3,456?', 4)).toBe('כמה ספרות יש ב-3,456? 4');
  });

  it('renders the whole equation, answer included, as one LTR run', () => {
    const { container } = render(<MathText>{teachLine('36 ÷ 9 = ?', 4)}</MathText>);
    const runs = [...container.querySelectorAll('bdi')].map(b => b.textContent);
    expect(runs).toEqual(['36 ÷ 9 = 4']);
  });
});

describe('streak wording', () => {
  it('says one day in the singular, for both genders', () => {
    expect(t('trophy_room.streak_one', { gender: 'f' })).toBe('יום אחד ברצף! 🔥');
    expect(t('trophy_room.streak_one', { gender: 'm' })).toBe('יום אחד ברצף! 🔥');
    expect(t('trophy_room.streak_sub_one', { gender: 'f' })).toBe('המשיכי כך!');
    expect(t('trophy_room.streak_sub_one', { gender: 'm' })).toBe('המשך כך!');
  });
});
