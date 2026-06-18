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
import { IconComponent } from '../../ui/icon/icon.component';
import { bigTime, dateParts } from './clock-formatter';
import { varsFor } from './fullscreen-style';
import { AUTO_HIDE_MS } from '../../config/animation-timing';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FullscreenConfigComponent, IconComponent],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
  host: {
    '(document:pointermove)': 'revealGear()',
    '(document:pointerdown)': 'revealGear()',
    '(document:keydown)': 'revealGear()',
  },
})
export class FullscreenFaceComponent implements OnDestroy {
  private readonly clock = inject(ClockService);
  private readonly size = inject(ContainerSizeDirective);
  private readonly store = inject(FullscreenConfigStore);
  private readonly faceConfig = inject(FaceConfigService);
  private readonly locale = navigator.language || 'en-US';

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activePreset = computed(() => this.store.resolveForRatio(this.ratio()));

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));

  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activePreset()));

  readonly gearVisible = signal(true);
  readonly configOpen = signal(false);

  private gearTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armGearTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.gearTimer);
    this.faceConfig.open.set(false);
  }

  revealGear(): void {
    if (this.configOpen()) return;
    this.gearVisible.set(true);
    this.armGearTimer();
  }

  openConfig(): void {
    this.configOpen.set(true);
    this.faceConfig.open.set(true);
  }

  onConfigClosed(): void {
    this.faceConfig.open.set(false);
    this.configOpen.set(false);
  }

  private armGearTimer(): void {
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.gearVisible.set(false), AUTO_HIDE_MS);
  }
}
