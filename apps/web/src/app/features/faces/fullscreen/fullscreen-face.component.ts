import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ClockService } from '@core/clock.service';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { ContainerSizeDirective } from '@shared/ui/container-size/container-size.directive';
import { FaceConfigService } from '@core/face-config.service';
import { FullscreenConfigStore } from './fullscreen-config-store.service';
import { FullscreenConfigComponent } from './fullscreen-config/fullscreen-config.component';
import { FullscreenTogglesComponent } from './fullscreen-toggles/fullscreen-toggles.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { bigTime, dateParts } from './clock-formatter';
import { varsFor } from './fullscreen-style';

@Component({
  selector: 'app-fullscreen-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoHideDirective, FullscreenConfigComponent, FullscreenTogglesComponent, IconComponent],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './fullscreen-face.component.html',
  styleUrl: './fullscreen-face.component.scss',
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

  readonly displayZone = computed(() => this.activeFields().timeZone || this.clock.timeZone());

  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.displayZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.displayZone()));

  readonly styleVars = computed<Record<string, string>>(() => varsFor(this.activeFields()));

  // Fraction of the current minute elapsed, ~30fps from clock.now(); drives the
  // bar's progress fill. Seconds/ms are invariant across modern (minute-aligned)
  // zone offsets, so local getters match the displayed time's seconds.
  readonly minuteProgress = computed(() => {
    const d = this.clock.now();
    return (d.getSeconds() + d.getMilliseconds() / 1000) / 60;
  });

  // The Display (toggles) panel is owned locally by the face's gear, unlike the
  // Adjust (size) panel which is triggered from the app controls bar.
  readonly togglesOpen = signal(false);

  ngOnDestroy(): void {
    this.faceConfig.open.set(false);
    this.faceConfig.adjustOpen.set(false);
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
}
