import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { type BarMode } from '../fullscreen-preset';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { ZoneCatalog, type TimeZoneOption } from '@core/zone-catalog';
import { countryCodeForZone } from '@core/zone-country';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';
import { FlagComponent } from '@shared/ui/flag/flag.component';
import { KnobToggleComponent } from '@allyworld/alloy-ui';

/**
 * Dimension-agnostic visibility toggles for the Fullscreen face (Weekday / GMT /
 * Bar), opened from the face's gear. Each toggle writes the value to EVERY band
 * (so it "applies to all"); the per-band fields are kept for future per-band
 * control. Rendered in a partial bottom sheet (close = apply).
 */
@Component({
  selector: 'app-fullscreen-toggles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SheetComponent,
    NavHeaderComponent,
    IconButtonComponent,
    ZonePickerComponent,
    FlagComponent,
    KnobToggleComponent,
  ],
  templateUrl: './fullscreen-toggles.component.html',
  styleUrl: './fullscreen-toggles.component.scss',
})
export class FullscreenTogglesComponent {
  private readonly store = inject(FullscreenConfigStore);
  private readonly catalog = inject(ZoneCatalog);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  // Every band shares these values (toggles write all), so read a sample band.
  readonly showSeconds = computed(() => this.store.sample().secondsVisible);
  readonly showWeekday = computed(() => this.store.sample().sections.weekday.visible);
  readonly showZone = computed(() => this.store.sample().zoneVisible);
  readonly showGmt = computed(() => this.store.sample().sections.gmt.visible);
  readonly showFlag = computed(() => this.store.sample().flagVisible);
  readonly barMode = computed(() => this.store.sample().bar.mode);
  readonly barModes: readonly { mode: BarMode; label: string }[] = [
    { mode: 'off', label: 'Off' },
    { mode: 'divider', label: 'Divider' },
    { mode: 'progress', label: 'Progress' },
  ];

  readonly zonePickerOpen = signal(false);
  readonly faceZone = computed(() => this.store.sample().timeZone);
  // "Follow Time Machine" synthetic entry prepended; '' never reaches Intl.
  readonly zoneOptions: TimeZoneOption[] = [
    { id: '', label: 'Follow Time Machine', offset: -100000 },
    ...this.catalog.options(),
  ];
  readonly faceZoneLabel = computed(
    () => this.zoneOptions.find((z) => z.id === this.faceZone())?.label ?? this.faceZone(),
  );
  // Zone id -> ISO country code for the selector flag (null -> globe fallback).
  readonly countryFor = countryCodeForZone;

  openZonePicker(): void {
    this.zonePickerOpen.set(true);
  }
  closeZonePicker(): void {
    this.zonePickerOpen.set(false);
  }
  pickZone(id: string): void {
    this.store.setTimeZoneAll(id);
    this.zonePickerOpen.set(false);
  }

  toggleSeconds(): void {
    this.store.setSecondsVisibleAll(!this.showSeconds());
  }
  toggleWeekday(): void {
    this.store.setSectionVisibleAll('weekday', !this.showWeekday());
  }
  toggleZone(): void {
    this.store.setZoneVisibleAll(!this.showZone());
  }
  toggleGmt(): void {
    this.store.setSectionVisibleAll('gmt', !this.showGmt());
  }
  toggleFlag(): void {
    this.store.setFlagVisibleAll(!this.showFlag());
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
