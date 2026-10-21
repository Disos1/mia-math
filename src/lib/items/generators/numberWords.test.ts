import { describe, it, expect } from 'vitest';
import { numberWords } from './numberWords';

describe('Hebrew number words', () => {
  it('writes the examples the app has used since July', () => {
    expect(numberWords(405_070)).toBe('ארבע מאות וחמישה אלף ושבעים');
    expect(numberWords(300_405)).toBe('שלוש מאות אלף ארבע מאות וחמש');
    expect(numberWords(200_030)).toBe('מאתיים אלף ושלושים');
    expect(numberWords(704_009)).toBe('שבע מאות וארבעה אלף ותשע');
  });

  it('counts small numbers in the feminine', () => {
    expect(numberWords(345)).toBe('שלוש מאות ארבעים וחמש');
    expect(numberWords(2)).toBe('שתיים');
    expect(numberWords(12)).toBe('שתים עשרה');
    expect(numberWords(315)).toBe('שלוש מאות וחמש עשרה');
  });

  it('counts thousands in the masculine, with the special forms up to ten', () => {
    expect(numberWords(1_000)).toBe('אלף');
    expect(numberWords(2_000)).toBe('אלפיים');
    expect(numberWords(3_000)).toBe('שלושת אלפים');
    expect(numberWords(10_000)).toBe('עשרת אלפים');
    expect(numberWords(11_000)).toBe('אחד עשר אלף');
    expect(numberWords(12_000)).toBe('שנים עשר אלף');
    expect(numberWords(45_000)).toBe('ארבעים וחמישה אלף');
    expect(numberWords(102_000)).toBe('מאה ושניים אלף');
  });

  it('puts "ו" after the thousands only before a single word', () => {
    expect(numberWords(600_082)).toBe('שש מאות אלף שמונים ושתיים');
    expect(numberWords(3_015)).toBe('שלושת אלפים וחמש עשרה');
    expect(numberWords(1_100)).toBe('אלף ומאה');
    expect(numberWords(345_678)).toBe('שלוש מאות ארבעים וחמישה אלף שש מאות שבעים ושמונה');
  });

  it('covers the ends of the range', () => {
    expect(numberWords(1_000_000)).toBe('מיליון');
    expect(numberWords(999_999)).toBe('תשע מאות תשעים ותשעה אלף תשע מאות תשעים ותשע');
  });
});
