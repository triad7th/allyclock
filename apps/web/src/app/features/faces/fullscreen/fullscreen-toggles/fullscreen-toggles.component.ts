import { ChangeDetectionStrategy, Component, computed, inject, output, viewChild } from '@angular/core';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { type BarMode } from '../fullscreen-preset';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';

/**
 * Dimension-agnostic visibility toggles for the Fullscreen face (Weekday / GMT /
 * Bar), opened from the face's gear. Each toggle writes the value to EVERY band
 * (so it "applies to all"); the per-band fields are kept for future per-band
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

  // Every band shares these values (toggles write all), so read a sample band.
  readonly showWeekday = computed(() => this.store.sample().sections.weekday.visible);
  readonly showGmt = computed(() => this.store.sample().sections.gmt.visible);
  readonly barMode = computed(() => this.store.sample().bar.mode);
  readonly barModes: ReadonlyArray<{ mode: BarMode; label: string }> = [
    { mode: 'off', label: 'Off' },
    { mode: 'divider', label: 'Divider' },
    { mode: 'progress', label: 'Progress' },
  ];

  toggleWeekday(): void {
    this.store.setSectionVisibleAll('weekday', !this.showWeekday());
  }
  toggleGmt(): void {
    this.store.setSectionVisibleAll('gmt', !this.showGmt());
  }
  setBarMode(mode: BarMode): void {
    this.store.setBarModeAll(mode);
  }

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }
}
