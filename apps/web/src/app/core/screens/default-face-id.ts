// The face a fresh screen starts on, and the migration fallback when no legacy
// face preference exists. Defined in core so ScreensService can read it without
// a core -> features import (see the tier dependency rule). The face registry
// re-exports it under the same public name.
export const DEFAULT_FACE_ID = 'fullscreen';
