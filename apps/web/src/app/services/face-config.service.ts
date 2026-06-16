import { Injectable, signal } from '@angular/core';

// True while a face's nested configuration panel (e.g. the Daily Schedule
// settings) is open, so the app's Face/Time controls can hide — you shouldn't
// switch face or scrub time from inside a face's own configuration.
@Injectable({ providedIn: 'root' })
export class FaceConfigService {
  readonly open = signal(false);
}
