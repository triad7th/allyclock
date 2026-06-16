import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ScheduleStoreService } from './schedule-store.service';
import { ScheduleConfigComponent } from './schedule-config/schedule-config.component';
import { IconComponent } from '../../ui/icon/icon.component';
import { activeSegment, currentPixelY } from './schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';

const HIDE_DELAY_MS = 4000;
// Matches the config-slide-out animation duration in the config SCSS.
const CONFIG_CLOSE_MS = 300;

@Component({
  selector: 'app-schedule-face',
  imports: [ScheduleConfigComponent, IconComponent],
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

  readonly defaultImageSrc = DEFAULT_IMAGE_SRC;
  readonly imageUrl = signal(DEFAULT_IMAGE_SRC);
  readonly segments = signal(DEFAULT_SEGMENTS);
  readonly naturalWidth = signal(0);
  readonly viewportWidth = signal(window.innerWidth);
  readonly viewportHeight = signal(window.innerHeight);
  readonly gearVisible = signal(true);
  readonly configOpen = signal(false);
  readonly configClosing = signal(false);

  private readonly config = viewChild(ScheduleConfigComponent);

  private gearTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly onResize = () => {
    this.viewportWidth.set(window.innerWidth);
    this.viewportHeight.set(window.innerHeight);
  };

  readonly scaleFactor = computed(() => {
    const nw = this.naturalWidth();
    return nw === 0 ? 1 : this.viewportWidth() / nw;
  });

  readonly translateY = computed(() => {
    const pixY = currentPixelY(this.clock.now(), this.segments());
    const vh = this.viewportHeight();
    return -(pixY * this.scaleFactor() - vh / 2);
  });

  readonly redBoxTop = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments());
    return seg ? seg.pixelStart * this.scaleFactor() : 0;
  });

  readonly redBoxHeight = computed(() => {
    const seg = activeSegment(this.clock.now(), this.segments());
    return seg ? (seg.pixelEnd - seg.pixelStart) * this.scaleFactor() : 0;
  });

  ngOnInit(): void {
    window.addEventListener('resize', this.onResize);
    this.armGearTimer();
    this.loadActivePreset();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.gearTimer);
    clearTimeout(this.closeTimer);
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
    // Closed → open the editor. Open → the gear is the "X": cancel without
    // saving, letting the config clean up any pending image/object URL.
    if (!this.configOpen()) {
      this.configOpen.set(true);
      return;
    }
    const cfg = this.config();
    if (cfg) cfg.cancel();
    else this.configOpen.set(false);
  }

  // The check button: commit the editor's changes (it emits saved on success).
  onSaveClick(): void {
    this.config()?.done();
  }

  onConfigSaved(): void {
    this.loadActivePreset();
    this.beginConfigClose();
  }

  onConfigCancelled(): void {
    this.beginConfigClose();
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

  // Run the slide-out animation, then remove the config page from the DOM.
  // The save/cancel side effects have already run; only the visual exit waits.
  private beginConfigClose(): void {
    if (this.configClosing()) return;
    this.configClosing.set(true);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.configOpen.set(false);
      this.configClosing.set(false);
    }, CONFIG_CLOSE_MS);
  }

  private armGearTimer(): void {
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.gearVisible.set(false), HIDE_DELAY_MS);
  }
}
