// Shared animation timing constants.
//
// SHEET_ANIMATION_MS is pushed to the --sheet-anim CSS var at bootstrap
// (single source of truth); SCSS uses var(--sheet-anim, 0.28s).
export const SHEET_ANIMATION_MS = 280;

// How long an auto-hiding control stays visible before fading out.
export const AUTO_HIDE_MS = 4000;

// FACE_TRANSITION_MS is pushed to the --face-anim CSS var at bootstrap
// (single source of truth); SCSS uses var(--face-anim, 0.3s).
export const FACE_TRANSITION_MS = 300;

// Mirror the timing constants into CSS custom properties so SCSS derives from
// the same source of truth. Called once at app startup.
export function applyAnimationTimingVars(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--sheet-anim', `${SHEET_ANIMATION_MS}ms`);
  root.style.setProperty('--face-anim', `${FACE_TRANSITION_MS}ms`);
}
