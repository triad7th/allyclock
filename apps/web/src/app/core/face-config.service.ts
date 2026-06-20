import { Injectable, signal } from '@angular/core';

// True while a face's nested configuration panel (e.g. the Daily Schedule
// settings) is open, so the app's Face/Time controls can hide — you shouldn't
// switch face or scrub time from inside a face's own configuration.
@Injectable({ providedIn: 'root' })
export class FaceConfigService {
  // True while any face config panel is open (hides the app Face/Time/Adjust
  // controls).
  readonly open = signal(false);
  // True while the Fullscreen "Adjust" (size) panel should be shown — set by the
  // controls-bar Adjust button, read by the Fullscreen face. (The face's gear
  // owns the separate "toggles" panel locally.)
  readonly adjustOpen = signal(false);
}
