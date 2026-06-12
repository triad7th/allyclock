import { Component, computed, inject } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { bigTime, dateTZ, precise } from './clock-formatter';

@Component({
  selector: 'app-fullscreen-face',
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
})
export class FullscreenFaceComponent {
  private readonly clock = inject(ClockService);
  private readonly locale = navigator.language || 'en-US';
  private readonly timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.timeZone));
  readonly preciseText = computed(() => precise(this.clock.now(), this.timeZone));
  readonly dateTZText = computed(() => dateTZ(this.clock.now(), this.locale, this.timeZone));
}
