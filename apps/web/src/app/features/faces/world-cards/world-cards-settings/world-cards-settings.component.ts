import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';
import { MIN_CARDS, MAX_CARDS } from '../world-cards-config';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { ZoneCatalog, type TimeZoneOption, buildSpecialZones } from '@core/zone-catalog';
import { countryCodeForZone } from '@core/zone-country';
import { zoneCity } from '../../fullscreen/clock-formatter';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';
import { FlagComponent } from '@shared/ui/flag/flag.component';
import { KnobToggleComponent } from '@allyworld/alloy-ui';

/**
 * World Cards Settings: manage the card list (zone + line-break flag, add/remove).
 * Opened from the face's gear, rendered in a bottom sheet (close = apply). A
 * zone-picker sub-view replaces the list while editing a card's zone.
 */
@Component({
  selector: 'app-world-cards-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SheetComponent,
    NavHeaderComponent,
    IconButtonComponent,
    IconComponent,
    ZonePickerComponent,
    FlagComponent,
    KnobToggleComponent,
  ],
  templateUrl: './world-cards-settings.component.html',
  styleUrl: './world-cards-settings.component.scss',
})
export class WorldCardsSettingsComponent {
  private readonly store = inject(WorldCardsConfigStore);
  private readonly catalog = inject(ZoneCatalog);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);
  private readonly localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  readonly cards = computed(() => this.store.sample().cards);
  readonly canRemove = computed(() => this.cards().length > MIN_CARDS);
  readonly canAdd = computed(() => this.cards().length < MAX_CARDS);

  readonly zoneOptions: TimeZoneOption[] = [...buildSpecialZones(), ...this.catalog.options()];
  readonly editingCardId = signal<number | null>(null);

  readonly countryFor = countryCodeForZone;
  cityLabel(zone: string): string {
    return zoneCity(zone, true) || this.zoneOptions.find((z) => z.id === zone)?.label || zone;
  }
  selectedZone(): string {
    const id = this.editingCardId();
    return this.cards().find((c) => c.id === id)?.zone ?? '';
  }

  setLineBreak(id: number, value: boolean): void {
    this.store.setCardLineBreak(id, value);
  }
  remove(id: number): void {
    this.store.removeCard(id);
  }
  add(): void {
    this.store.addCard(this.localZone);
  }

  openZonePicker(id: number): void {
    this.editingCardId.set(id);
  }
  closeZonePicker(): void {
    this.editingCardId.set(null);
  }
  pickZone(zone: string): void {
    const id = this.editingCardId();
    if (id != null) this.store.setCardZone(id, zone);
    this.editingCardId.set(null);
  }

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }
}
