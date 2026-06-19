import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
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
  host: { '(window:resize)': 'onViewportResize()' },
})
export class FullscreenConfigComponent {
  protected readonly store = inject(FullscreenConfigStore);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  // Editing selection
  readonly editingId = signal<string>(this.store.state().presets[0].id);

  readonly editingPreset = computed(
    () =>
      this.store.state().presets.find((p) => p.id === this.editingId()) ??
      this.store.state().presets[0],
  );

  // Live screen dimensions. The full-screen face renders into the viewport, so
  // the config auto-selects the preset whose band contains the current ratio and
  // re-selects when the window is resized.
  private readonly viewW = signal(typeof window !== 'undefined' ? window.innerWidth : 0);
  private readonly viewH = signal(typeof window !== 'undefined' ? window.innerHeight : 0);
  readonly currentRatio = computed(() => (this.viewH() > 0 ? this.viewW() / this.viewH() : 1));

  constructor() {
    // Auto-select the preset that fits the current screen on open.
    this.syncToViewport();
  }

  onViewportResize(): void {
    this.viewW.set(window.innerWidth);
    this.viewH.set(window.innerHeight);
    this.syncToViewport();
  }

  /** Point the editor at the preset whose band contains the current screen ratio. */
  private syncToViewport(): void {
    this.editingId.set(this.store.resolveForRatio(this.currentRatio()).id);
  }

  close(): void { this.sheet()?.close(); }
  onSheetClosed(): void { this.closed.emit(); }

  // ── Section knobs ────────────────────────────────────────────────────────

  /** Compute --fill % for a slider given its current value and range. */
  fillPct(value: number, min: number, max: number): string {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  toggleWeekday(): void {
    this.store.setShowWeekday(!this.store.state().showWeekday);
  }

  toggleGmt(): void {
    this.store.setShowGmt(!this.store.state().showGmt);
  }

  onSectionSize(key: SectionKey, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.updateSection(this.editingId(), key, { sizeScale: value });
  }

  onDateSize(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    for (const key of DATE_SECTION_KEYS) {
      this.store.updateSection(this.editingId(), key, { sizeScale: value });
    }
  }

  toggleBar(): void {
    this.store.updateBar(this.editingId(), { visible: !this.editingPreset().bar.visible });
  }
}
