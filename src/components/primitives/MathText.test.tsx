/**
 * Bidi isolation — the difference between "500 − 163" and a question that reads
 * "163 − 500" to the child. Mixed numbers matter too: "2 1/3" split into two
 * runs renders with the whole number on the wrong side of its fraction.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathText } from './MathText';

const isolates = (s: string): string[] =>
  [...renderToStaticMarkup(<MathText>{s}</MathText>).matchAll(/<bdi[^>]*>(.*?)<\/bdi>/g)].map(m => m[1]);

describe('MathText', () => {
  it('isolates an expression', () => {
    expect(isolates('כמה זה 500 − 163?')).toEqual(['500 − 163']);
  });

  it('isolates a mixed number as one run', () => {
    expect(isolates('2 1/3')).toEqual(['2 1/3']);
  });

  it('isolates a bare fraction', () => {
    expect(isolates('איזה חלק שווה ל-3/8?')).toEqual(['3/8']);
  });

  it('isolates a negative number so the sign stays on the left', () => {
    expect(isolates('הטמפרטורה היא −3 מעלות')).toEqual(['−3']);
  });

  it('does not read the Hebrew prefix hyphen as a minus sign', () => {
    // "ל-3/8" is "to 3/8", not "minus 3".
    expect(isolates('כמה חסר ל-3/8?')).toEqual(['3/8']);
    expect(isolates('הוסיפו ב-5 מעלות')).toEqual([]);
  });

  it('keeps the degree sign with its number', () => {
    // "−7°" split into <bdi>−7</bdi>° displayed as "°−7" in the live app.
    // Question and answer are separate strings in the app, as here.
    expect(isolates('−7°')).toEqual(['−7°']);                       // an option chip
    expect(isolates('הטמפרטורה הייתה 0° וירדה ב-7 מעלות')).toEqual(['0°']);
  });

  it('isolates a bracketed expression together with its brackets', () => {
    expect(isolates('כמה זה 20 − (4 + 3)?')).toEqual(['20 − (4 + 3)']);
    expect(isolates('כמה זה 36 ÷ (3 × 2)?')).toEqual(['36 ÷ (3 × 2)']);
  });

  it('leaves a Hebrew parenthetical alone', () => {
    expect(isolates('147 ÷ 3 — כמה יוצא (בלי השארית)?')).toEqual(['147 ÷ 3']);
  });

  it('isolates a sum of fractions whole', () => {
    expect(isolates('כמה זה 3/8 + 2/8?')).toEqual(['3/8 + 2/8']);
  });
});
