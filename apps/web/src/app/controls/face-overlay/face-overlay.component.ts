import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { ContainerSizeDirective } from '../../ui/container-size/container-size.directive';
import { DimensionRegistry } from '../../services/dimension-registry.service';
import { ClockService } from '../../services/clock.service';
import { FaceConfigService } from '../../services/face-config.service';
import { AUTO_HIDE_MS } from '../../config/animation-timing';

// App-shell overlay shown above every face (outside the crossfade layers): a
// top-left "W × H · BAND" label and a top-right LIVE/MOCK chip. Measures the
// viewport itself via ContainerSizeDirective and resolves the band from the
// shared registry. Auto-hides with its own timer (mirrors the face controls).
@Component({
  selector: 'app-face-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './face-overlay.component.html',
  styleUrl: './face-overlay.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class FaceOverlayComponent implements OnDestroy {
  private readonly size = inject(ContainerSizeDirective);
  private readonly registry = inject(DimensionRegistry);
  private readonly clock = inject(ClockService);
  protected readonly faceConfig = inject(FaceConfigService);

  /** True while the face-picker sheet is open (passed by the app shell). */
  readonly sheetOpen = input(false);

  readonly width = this.size.width;
  readonly height = this.size.height;
  readonly band = computed(() =>
    this.registry.resolveForRatio(this.height() > 0 ? this.width() / this.height() : 1),
  );
  readonly isMocked = this.clock.isMocked;

  readonly visible = signal(true);
  readonly hidden = computed(() => !this.visible() || this.faceConfig.open() || this.sheetOpen());

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.armTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
  }

  reveal(): void {
    if (this.faceConfig.open()) return; // no-op while a config panel is open
    this.visible.set(true);
    this.armTimer();
  }

  private armTimer(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(false), AUTO_HIDE_MS);
  }
}
