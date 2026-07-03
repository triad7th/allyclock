import { describe, it, expect } from 'vitest';
import { snapIndex } from './swipe-snap';

describe('snapIndex', () => {
  const W = 400;
  it('stays put for a small slow drag', () => {
    expect(snapIndex(1, 40, 0, W, 3)).toBe(1);
    expect(snapIndex(1, -40, 0, W, 3)).toBe(1);
  });

  it('advances to the next screen past the half-width threshold', () => {
    expect(snapIndex(1, -210, 0, W, 3)).toBe(2); // dragged left -> next
  });

  it('returns to the previous screen when dragged right past half', () => {
    expect(snapIndex(1, 210, 0, W, 3)).toBe(0);
  });

  it('a fast flick counts even when short', () => {
    expect(snapIndex(1, -30, -0.6, W, 3)).toBe(2); // flick left
    expect(snapIndex(1, 30, 0.6, W, 3)).toBe(0); // flick right
  });

  it('clamps at the ends', () => {
    expect(snapIndex(0, 300, 1, W, 3)).toBe(0);
    expect(snapIndex(2, -300, -1, W, 3)).toBe(2);
  });
});
