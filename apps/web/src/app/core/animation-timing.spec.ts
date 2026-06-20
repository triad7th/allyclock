import { describe, it, expect } from 'vitest';
import {
  applyAnimationTimingVars,
  SHEET_ANIMATION_MS,
  FACE_TRANSITION_MS,
} from './animation-timing';

describe('applyAnimationTimingVars', () => {
  it('writes --sheet-anim / --face-anim from the TS constants', () => {
    const el = document.createElement('div');
    applyAnimationTimingVars(el);
    expect(el.style.getPropertyValue('--sheet-anim')).toBe(`${SHEET_ANIMATION_MS}ms`);
    expect(el.style.getPropertyValue('--face-anim')).toBe(`${FACE_TRANSITION_MS}ms`);
  });
});
