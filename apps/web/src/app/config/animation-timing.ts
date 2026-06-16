// Shared animation timing constants.
//
// SHEET_ANIMATION_MS MUST equal the `$sheet-anim` token (0.28s) in
// src/app/ui/tokens.scss: the TypeScript timer that emits `(closed)` and the
// SCSS slide/fade keyframes have to finish together.
export const SHEET_ANIMATION_MS = 280;

// How long an auto-hiding control stays visible before fading out.
export const AUTO_HIDE_MS = 4000;

// FACE_TRANSITION_MS MUST equal the `$face-anim` token (0.3s) in src/app/ui/tokens.scss.
export const FACE_TRANSITION_MS = 300;
