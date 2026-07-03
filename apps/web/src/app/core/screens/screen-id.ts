import { InjectionToken } from '@angular/core';

// The id of the screen a face-config store belongs to. Provided on each screen
// host's outlet injector; the scoped stores inject it to namespace their keys.
// Apple port: the analogue is the screen's identity passed into its config view.
export const SCREEN_ID = new InjectionToken<number>('SCREEN_ID');
