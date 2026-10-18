/**
 * The cube nets are computed, so the computation is pinned to the known
 * answer: of the 35 six-square shapes, exactly 11 fold into a cube.
 */
import { describe, it, expect } from 'vitest';
import { fixedPolyominoes, foldCube, freeKey, perimeterOf, oppositeFace, type Cell } from './gridUtils';

describe('squared-paper geometry', () => {
  const hexes = fixedPolyominoes(6);

  it('finds every six-square shape', () => {
    expect(new Set(hexes.map(freeKey)).size).toBe(35);
  });

  it('folds exactly the 11 cube nets', () => {
    expect(new Set(hexes.filter(h => foldCube(h)).map(freeKey)).size).toBe(11);
  });

  it('refuses a 2×3 block and accepts the cross', () => {
    const block: Cell[] = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]];
    const cross: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]];
    expect(foldCube(block)).toBeNull();
    expect(foldCube(cross)).not.toBeNull();
  });

  it('puts the ends of a row of three on opposite faces', () => {
    const cross: Cell[] = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]];
    const f = foldCube(cross)!;
    expect(f[3]).toBe(oppositeFace(f[1]));      // [0,1] and [2,1]
    expect(f[0]).toBe(oppositeFace(f[4]));      // [1,0] and [1,2]
  });

  it('counts the outline of a shape in cell sides', () => {
    expect(perimeterOf([[0, 0]])).toBe(4);
    expect(perimeterOf([[0, 0], [1, 0], [0, 1]])).toBe(8);
  });
});
