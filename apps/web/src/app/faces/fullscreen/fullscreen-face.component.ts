import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { bigTime, dateParts, minuteFraction } from './clock-formatter';
import { varsFor } from './fullscreen-style';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
})
export class FullscreenFaceComponent {
  private readonly clock = inject(ClockService);
  private readonly size = inject(ContainerSizeDirective);
  private readonly store = inject(FullscreenConfigStore);
  private readonly locale = navigator.language || 'en-US';

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activePreset = computed(() => this.store.activeFor(this.ratio()));

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly barFill = computed(() => minuteFraction(this.clock.now()));

  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activePreset()));
}
