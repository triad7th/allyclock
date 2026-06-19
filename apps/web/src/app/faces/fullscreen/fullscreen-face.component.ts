import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { FaceConfigService } from '../../services/face-config.service';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { FullscreenConfigComponent } from './fullscreen-config/fullscreen-config.component';
import { bigTime, dateParts } from './clock-formatter';
import { varsFor } from './fullscreen-style';
import { AUTO_HIDE_MS } from '../../config/animation-timing';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullscreenConfigComponent],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class FullscreenFaceComponent implements OnDestroy {
  private readonly clock = inject(ClockService);
  private readonly size = inject(ContainerSizeDirective);
  protected readonly store = inject(FullscreenConfigStore);
  protected readonly faceConfig = inject(FaceConfigService);
  private readonly locale = navigator.language || 'en-US';

  readonly width = this.size.width;
  readonly height = this.size.height;

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activePreset = computed(() => this.store.resolveForRatio(this.ratio()));

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));

  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activePreset()));

  readonly controlsVisible = signal(true);

  private controlsTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armControlsTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.controlsTimer);
    this.faceConfig.open.set(false);
  }

  reveal(): void {
    if (this.faceConfig.open()) return;
    this.controlsVisible.set(true);
    this.armControlsTimer();
  }

  onConfigClosed(): void {
    this.faceConfig.open.set(false);
  }

  private armControlsTimer(): void {
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => this.controlsVisible.set(false), AUTO_HIDE_MS);
  }
}
