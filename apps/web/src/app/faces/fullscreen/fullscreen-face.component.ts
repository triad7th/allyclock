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
import { FullscreenTogglesComponent } from './fullscreen-toggles/fullscreen-toggles.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { bigTime, dateParts } from './clock-formatter';
import { varsFor } from './fullscreen-style';
import { AUTO_HIDE_MS } from '@core/animation-timing';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullscreenConfigComponent, FullscreenTogglesComponent, IconComponent],
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

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activeFields = computed(() => this.store.fieldsFor(this.ratio()));

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));

  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activeFields()));

  readonly controlsVisible = signal(true);

  // The Display (toggles) panel is owned locally by the face's gear, unlike the
  // Adjust (size) panel which is triggered from the app controls bar.
  readonly togglesOpen = signal(false);

  private controlsTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armControlsTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.controlsTimer);
    this.faceConfig.open.set(false);
    this.faceConfig.adjustOpen.set(false);
  }

  reveal(): void {
    if (this.faceConfig.open()) return;
    this.controlsVisible.set(true);
    this.armControlsTimer();
  }

  openToggles(): void {
    this.togglesOpen.set(true);
    // Hide the app controls bar while a face panel is open (same as Adjust).
    this.faceConfig.open.set(true);
  }

  closeToggles(): void {
    this.togglesOpen.set(false);
    this.faceConfig.open.set(false);
  }

  closeAdjust(): void {
    this.faceConfig.adjustOpen.set(false);
    this.faceConfig.open.set(false);
  }

  private armControlsTimer(): void {
    clearTimeout(this.controlsTimer);
    this.controlsTimer = setTimeout(() => this.controlsVisible.set(false), AUTO_HIDE_MS);
  }
}
