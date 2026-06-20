import { ChangeDetectionStrategy, Component, computed, inject, input, viewChild } from '@angular/core';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { ContainerSizeDirective } from '@shared/ui/container-size/container-size.directive';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { ClockService } from '@core/clock.service';
import { FaceConfigService } from '@core/face-config.service';

// App-shell overlay shown above every face (outside the crossfade layers): a
// top-left "W × H · BAND" label and a top-right LIVE/MOCK chip. Measures the
// viewport itself via ContainerSizeDirective and resolves the band from the
// shared registry. Auto-hides with its own timer (mirrors the face controls).
@Component({
  selector: 'app-face-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoHideDirective],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './face-overlay.component.html',
  styleUrl: './face-overlay.component.scss',
})
export class FaceOverlayComponent {
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

  private readonly _ah = viewChild(AutoHideDirective);

  /** Delegated to the directive; kept for spec compatibility. */
  readonly visible = computed(() => this._ah()?.visible() ?? true);

  /** Delegated to the directive; kept for spec compatibility. */
  readonly hidden = computed(() => !this.visible() || this.faceConfig.open() || this.sheetOpen());

  /** Delegated to the directive; kept for spec compatibility. */
  reveal(): void {
    this._ah()?.reveal();
  }
}
