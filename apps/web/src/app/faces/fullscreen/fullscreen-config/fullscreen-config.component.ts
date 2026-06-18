import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
import { ClockService } from '../../../services/clock.service';
import { bigTime, dateParts } from '../clock-formatter';
import { varsFor } from '../fullscreen-style';
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
  private readonly clock = inject(ClockService);
  private readonly locale = navigator.language || 'en-US';
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  // Editing selection
  readonly editingId = signal<string>(this.store.state().presets[0].id);

  readonly editingPreset = computed(
    () =>
      this.store.state().presets.find((p) => p.id === this.editingId()) ??
      this.store.state().presets[0],
  );

  // Rename state
  readonly renaming = signal(false);

  // Live preview computeds
  readonly big = computed(() => bigTime(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly parts = computed(() => dateParts(this.clock.now(), this.locale, this.clock.timeZone()));
  readonly previewVars = computed(() => varsFor(this.editingPreset()));

  // Preview aspect ratio: clamp band midpoint to reasonable range
  readonly previewAspect = computed(() => {
    const p = this.editingPreset();
    const max = isFinite(p.maxRatio) ? p.maxRatio : p.minRatio + 1;
    const min = p.minRatio;
    const mid = (min + max) / 2;
    return Math.max(0.3, Math.min(3, mid));
  });

  close(): void { this.sheet()?.close(); }
  onSheetClosed(): void { this.closed.emit(); }

  private selectPreset(id: string): void {
    if (id !== this.editingId()) {
      this.editingId.set(id);
      this.renaming.set(false);
    }
  }

  cardClick(id: string): void {
    if (id === this.editingId()) {
      this.startRename();
    } else {
      this.selectPreset(id);
    }
  }

  startRename(): void {
    this.renaming.set(true);
    queueMicrotask(() => this.nameInput()?.nativeElement.focus());
  }

  commitRename(value: string): void {
    if (!this.renaming()) return;
    const trimmed = value.trim();
    if (trimmed) {
      this.store.renamePreset(this.editingId(), trimmed);
    }
    this.renaming.set(false);
  }

  onCommitRenameEvent(event: Event): void {
    this.commitRename((event.target as HTMLInputElement).value);
  }

  /** Format ratio band label, e.g. "≥2" / "1.5–2" / "<0.62" */
  bandLabel(minRatio: number, maxRatio: number): string {
    if (!isFinite(maxRatio)) return `≥${minRatio}`;
    if (minRatio === 0) return `<${maxRatio}`;
    return `${minRatio}–${maxRatio}`;
  }

  // ── Section knobs ────────────────────────────────────────────────────────

  /** Compute --fill % for a slider given its current value and range. */
  fillPct(value: number, min: number, max: number): string {
    const pct = Math.round(((value - min) / (max - min)) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }

  toggleVisible(key: SectionKey): void {
    const current = this.editingPreset().sections[key].visible;
    this.store.updateSection(this.editingId(), key, { visible: !current });
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
