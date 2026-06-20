import { ChangeDetectionStrategy, Component, computed, inject, input, output, viewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { SheetComponent } from '../../../ui/sheet/sheet.component';
import { NavHeaderComponent } from '../../../ui/nav-header/nav-header.component';
import { IconButtonComponent } from '../../../ui/icon-button/icon-button.component';
import { type SectionKey, DATE_SECTION_KEYS } from '../fullscreen-preset';

@Component({
  selector: 'app-fullscreen-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SheetComponent, NavHeaderComponent, IconButtonComponent, DecimalPipe],
  templateUrl: './fullscreen-config.component.html',
  styleUrl: './fullscreen-config.component.scss',
})
export class FullscreenConfigComponent {
  protected readonly store = inject(FullscreenConfigStore);
  private readonly registry = inject(DimensionRegistry);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  // The full-screen face's live ratio. The panel auto-selects the band for this
  // ratio and re-selects reactively when the face resizes. (Always the viewport
  // ratio — the Adjust panel is only opened over the full-screen face.)
  readonly ratio = input.required<number>();

  readonly editingBand = computed(() => this.registry.resolveForRatio(this.ratio()));
  readonly editingFields = computed(() => this.store.config(this.editingBand().id));

  close(): void { this.sheet()?.close(); }
  onSheetClosed(): void { this.closed.emit(); }

  /** Compute --fill % for a slider given its current value and range. */
  fillPct(value: number, min: number, max: number): string {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  onSectionSize(key: SectionKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.updateSection(this.editingBand().id, key, { sizeScale: value });
  }

  onDateSize(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    for (const key of DATE_SECTION_KEYS) {
      this.store.updateSection(this.editingBand().id, key, { sizeScale: value });
    }
  }
}
