import { ChangeDetectionStrategy, Component, computed, inject, output, viewChild } from '@angular/core';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SheetComponent } from '../../../ui/sheet/sheet.component';
import { NavHeaderComponent } from '../../../ui/nav-header/nav-header.component';
import { IconButtonComponent } from '../../../ui/icon-button/icon-button.component';

/**
 * Dimension-agnostic visibility toggles for the Fullscreen face (Weekday / GMT /
 * Bar), opened from the face's gear. Each toggle writes the value to EVERY preset
 * (so it "applies to all"); the per-preset fields are kept for future per-preset
 * control. Rendered in a partial bottom sheet (close = apply).
 */
@Component({
  selector: 'app-fullscreen-toggles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent],
  templateUrl: './fullscreen-toggles.component.html',
  styleUrl: './fullscreen-toggles.component.scss',
})
export class FullscreenTogglesComponent {
  private readonly store = inject(FullscreenConfigStore);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  // Every preset shares these values (toggles write all), so read the first.
  readonly showWeekday = computed(() => this.store.state().presets[0].sections.weekday.visible);
  readonly showGmt = computed(() => this.store.state().presets[0].sections.gmt.visible);
  readonly showBar = computed(() => this.store.state().presets[0].bar.visible);

  toggleWeekday(): void {
    this.store.setSectionVisibleAll('weekday', !this.showWeekday());
  }
  toggleGmt(): void {
    this.store.setSectionVisibleAll('gmt', !this.showGmt());
  }
  toggleBar(): void {
    this.store.setBarVisibleAll(!this.showBar());
  }

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }
}
