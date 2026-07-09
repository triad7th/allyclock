// Shared animation timing constants.
//
// SHEET_ANIMATION_MS and AUTO_HIDE_MS moved to @allyworld/alloy-ui; re-exported
// here so existing `@core/animation-timing` imports keep working.
import { AUTO_HIDE_MS, SHEET_ANIMATION_MS } from '@allyworld/alloy-ui';
export { AUTO_HIDE_MS, SHEET_ANIMATION_MS };

// FACE_TRANSITION_MS is pushed to the --face-anim CSS var at bootstrap
// (single source of truth); SCSS uses var(--face-anim, 0.3s).
export const FACE_TRANSITION_MS = 300;

// Mirror the timing constants into CSS custom properties so SCSS derives from
// the same source of truth. Called once at app startup.
export function applyAnimationTimingVars(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--sheet-anim', `${SHEET_ANIMATION_MS}ms`);
  root.style.setProperty('--face-anim', `${FACE_TRANSITION_MS}ms`);
}
