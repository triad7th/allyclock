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

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly preciseText = computed(() => precise(this.clock.now(), this.clock.timeZone()));
  readonly dateTZText = computed(() => dateTZ(this.clock.now(), this.locale, this.clock.timeZone()));
}
