import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ScheduleStoreService } from './schedule-store.service';
import { ScheduleConfigComponent } from './schedule-config/schedule-config.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { FaceConfigService } from '../../services/face-config.service';
import { activeSegment, framedWindow } from './schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-schedule-face',
  imports: [ScheduleConfigComponent, IconComponent],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './schedule-face.component.html',
  styleUrl: './schedule-face.component.scss',
  host: {
    '(document:pointermove)': 'revealGear()',
    '(document:pointerdown)': 'revealGear()',
    '(document:keydown)': 'revealGear()',
  },
})
export class ScheduleFaceComponent implements OnInit, OnDestroy {
  private readonly clock = inject(ClockService);
  private readonly store = inject(ScheduleStoreService);
  private readonly size = inject(ContainerSizeDirective);
  private readonly faceConfig = inject(FaceConfigService);

  readonly defaultImageSrc = DEFAULT_IMAGE_SRC;
  readonly imageUrl = signal(DEFAULT_IMAGE_SRC);
  readonly segments = signal(DEFAULT_SEGMENTS);
  readonly naturalWidth = signal(0);
  // Measured from the host element (via the ContainerSize host directive) so the
  // face frames correctly full-screen AND inside the scaled face-picker preview
  // (the layout box is unaffected by any ancestor CSS transform).
  readonly containerWidth = this.size.width;
  readonly containerHeight = this.size.height;
  readonly gearVisible = signal(true);
  readonly configOpen = signal(false);

  private gearTimer: ReturnType<typeof setTimeout> | undefined;

  readonly scaleFactor = computed(() => {
    const nw = this.naturalWidth();
    return nw === 0 ? 1 : this.containerWidth() / nw;
  });

  readonly activeIndex = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments(), this.clock.timeZone());
    return seg ? this.segments().indexOf(seg) : 0;
  });

  readonly translateY = computed(
    () =>
      framedWindow(this.segments(), this.activeIndex(), this.scaleFactor(), this.containerHeight())
        .translateY,
  );

  readonly redBoxTop = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments(), this.clock.timeZone());
    return seg ? seg.pixelStart * this.scaleFactor() : 0;
  });

  readonly redBoxHeight = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments(), this.clock.timeZone());
    return seg ? (seg.pixelEnd - seg.pixelStart) * this.scaleFactor() : 0;
  });

  ngOnInit(): void {
    this.armGearTimer();
    this.loadActivePreset();
  }

  ngOnDestroy(): void {
    clearTimeout(this.gearTimer);
    this.faceConfig.open.set(false);
  }

  onImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
  }

  revealGear(): void {
    if (this.configOpen()) return;
    this.gearVisible.set(true);
    this.armGearTimer();
  }

  onGearClick(): void {
    // Open the editor. The header's X/checkmark close it; the gear is hidden
    // while the config is open. Setting the shared signal hides the app's
    // Face/Time controls so you can't switch face from inside this config.
    this.configOpen.set(true);
    this.faceConfig.open.set(true);
  }

  // The config commits every edit to the store immediately and runs its own exit
  // animation via <app-sheet>, emitting `closed` only after it finishes. Every
  // close path (X / backdrop / Escape) lands here, so we always reload the active
  // preset — a preset switch shows immediately, with no page refresh.
  onConfigClosed(): void {
    this.loadActivePreset();
    this.faceConfig.open.set(false);
    this.configOpen.set(false);
  }

  private loadActivePreset(): void {
    const state = this.store.loadState();
    // The store always seeds at least one preset and never deletes the last, so
    // presets[0] is a safe fallback if activePresetId ever points nowhere.
    const active = state.presets.find((p) => p.id === state.activePresetId) ?? state.presets[0];
    this.segments.set(active.segments);
    // Only touch imageUrl once we know the source, so re-loading after a save
    // doesn't flash the default image before the per-preset image resolves.
    if (!active.hasImage) {
      this.imageUrl.set(DEFAULT_IMAGE_SRC);
    } else {
      this.store.loadPresetImage(active.id).then((url) => this.imageUrl.set(url ?? DEFAULT_IMAGE_SRC));
    }
  }

  private armGearTimer(): void {
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.gearVisible.set(false), HIDE_DELAY_MS);
  }
}
