import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { ScheduleStoreService } from './schedule-store.service';
import { ScheduleConfigComponent } from './schedule-config/schedule-config.component';
import { activeSegment, currentPixelY } from './schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-schedule-face',
  imports: [ScheduleConfigComponent],
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

  private gearTimer: ReturnType<typeof setTimeout> | undefined;
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
    this.segments.set(this.store.loadSegments());
    this.store.loadImage().then((url) => {
      if (url) this.imageUrl.set(url);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.gearTimer);
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

  onConfigSaved(): void {
    this.segments.set(this.store.loadSegments());
    this.store.loadImage().then((url) => {
      if (url) this.imageUrl.set(url);
    });
    this.configOpen.set(false);
  }

  private armGearTimer(): void {
    clearTimeout(this.gearTimer);
    this.gearTimer = setTimeout(() => this.gearVisible.set(false), HIDE_DELAY_MS);
  }
}
