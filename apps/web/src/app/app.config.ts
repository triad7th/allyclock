import { ApplicationConfig, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { applyAnimationTimingVars } from '@core/animation-timing';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAppInitializer(() => applyAnimationTimingVars()),
  ],
};
