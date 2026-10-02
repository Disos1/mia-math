// @vitest-environment jsdom
/**
 * The ladder must write a number the way the question wrote it.
 *
 * Dima photographed this screen on 2026-10-02: the sequence question showed
 * "747,244", and the ladder answered "10000". Same lesson, two spellings.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { PracticeItem } from '../types';
import { StepLadder } from './Session';

afterEach(cleanup);

const item: PracticeItem = {
  itemId: 'x', skillCode: 'NUM_ORDER_LINE', skillHebrewKey: 'skill.NUM_ORDER_LINE',
  question: 'המשיכי את הסדרה. איזה מספר בא אחרי?',
  options: [], correct: 777244, signature: null, signatureCode: null,
  visual: { type: 'sequence', terms: [747244, 757244, 767244] },
  cpaLayer: 'abstract', difficulty: 2, answerMode: 'keypad',
  steps: [
    { text: 'בכמה משתנה כל מספר בסדרה? (עולה)', answer: 10000 },
    { text: 'מוסיפים 10,000 למספר האחרון:', answer: 777244 },
  ],
};

describe('step ladder', () => {
  it('writes the correct answer with thousands separators', () => {
    render(<StepLadder item={item} gender="f" onDone={vi.fn()} />);
    // Answer the first rung wrongly, which reveals the correct value.
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('✓'));
    expect(document.body.textContent).toContain('10,000');
    expect(document.body.textContent).not.toContain('10000');
  });

  it('shows the sequence as boxes, never as a comma-separated list', () => {
    render(<StepLadder item={item} gender="f" onDone={vi.fn()} />);
    // The three terms are present, and no run of them joined by ", ".
    expect(document.body.textContent).toContain('747,244');
    expect(document.body.textContent).not.toContain('747,244, 757,244');
  });
});
