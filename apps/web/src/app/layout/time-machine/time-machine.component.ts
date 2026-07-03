import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { ClockService } from '@core/clock.service';
import { ZoneCatalog, type TimeZoneOption } from '@core/zone-catalog';
import { countryCodeForZone } from '@core/zone-country';
import {
  instantFromWallClock,
  wallClockInZone,
  wallClockToInput,
  inputToWallClock,
  type WallClock,
} from '@core/zone-time';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { FlagComponent } from '@shared/ui/flag/flag.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { ZonePickerComponent } from '@shared/ui/zone-picker/zone-picker.component';

const MS_PER_DAY = 86400000;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// 1-based day of the year from a WallClock (Jan 1 === 1).
function dayOfYearOf(w: WallClock): number {
  const start = Date.UTC(w.year, 0, 0);
  const at = Date.UTC(w.year, w.month - 1, w.day);
  return Math.round((at - start) / MS_PER_DAY);
}

@Component({
  selector: 'app-time-machine',
  imports: [
    AutoHideDirective,
    FlagComponent,
    IconButtonComponent,
    IconComponent,
    NavHeaderComponent,
    SheetComponent,
    ZonePickerComponent,
  ],
  templateUrl: './time-machine.component.html',
  styleUrl: './time-machine.component.scss',
})
export class TimeMachineComponent {
  protected readonly clock = inject(ClockService);
  private readonly catalog = inject(ZoneCatalog);

  readonly isMocked = this.clock.isMocked;
  readonly panelOpen = signal(false);

  private readonly sheet = viewChild(SheetComponent);

  readonly zoneOptions: TimeZoneOption[] = this.catalog.options();

  // Zone id -> ISO country code for the selector flag (null -> globe fallback).
  readonly countryFor = countryCodeForZone;

  // datetime-local draft, held as the wall-clock string IN the TM zone.
  readonly draft = signal('');

  // Searchable Time Zone picker (a sub-view that replaces the controls).
  readonly tzPickerOpen = signal(false);

  // On-zone-change behaviour: 'move' keeps the typed digits and moves the
  // instant; 'freeze' keeps the instant and relabels. Session-only.
  readonly zoneChangeMode = signal<'move' | 'freeze'>('move');

  readonly activeZoneLabel = computed(
    () =>
      this.zoneOptions.find((z) => z.id === this.clock.timeZone())?.label ?? this.clock.timeZone(),
  );

  // The draft as a WallClock (TM zone). Falls back to "now" if the field is
  // mid-edit/invalid.
  private readonly wall = computed<WallClock>(
    () =>
      inputToWallClock(this.draft()) ?? wallClockInZone(this.clock.now(), this.clock.timeZone()),
  );

  readonly dayOfYear = computed(() => dayOfYearOf(this.wall()));
  readonly maxDayOfYear = computed(() => (isLeapYear(this.wall().year) ? 366 : 365));
  readonly minuteOfDay = computed(() => this.wall().hour * 60 + this.wall().minute);
  readonly dayLabel = computed(() => {
    const w = this.wall();
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: this.clock.timeZone(),
    }).format(instantFromWallClock(w, this.clock.timeZone()));
  });
  readonly timeLabel = computed(() => {
    const w = this.wall();
    return `${String(w.hour).padStart(2, '0')}:${String(w.minute).padStart(2, '0')}`;
  });

  readonly dayFillPercent = computed(() => {
    const max = this.maxDayOfYear();
    return max > 1 ? ((this.dayOfYear() - 1) / (max - 1)) * 100 : 0;
  });
  readonly timeFillPercent = computed(() => (this.minuteOfDay() / 1439) * 100);

  togglePanel(): void {
    if (this.panelOpen()) {
      this.cancel();
      return;
    }
    this.seedDraft();
    this.tzPickerOpen.set(false);
    this.panelOpen.set(true);
  }

  cancel(): void {
    this.sheet()?.close();
  }

  onDaySlider(value: string): void {
    const w = this.wall();
    const dayNum = Number(value);
    // Recompute month/day for the chosen day-of-year, same year/time.
    const date = new Date(Date.UTC(w.year, 0, dayNum));
    this.scrubTo(
      instantFromWallClock(
        {
          year: w.year,
          month: date.getUTCMonth() + 1,
          day: date.getUTCDate(),
          hour: w.hour,
          minute: w.minute,
        },
        this.clock.timeZone(),
      ),
    );
  }

  onTimeSlider(value: string): void {
    const w = this.wall();
    const minutes = Number(value);
    this.scrubTo(
      instantFromWallClock(
        { ...w, hour: Math.floor(minutes / 60), minute: minutes % 60 },
        this.clock.timeZone(),
      ),
    );
  }

  onDateTime(value: string): void {
    const w = inputToWallClock(value);
    if (w) this.scrubTo(instantFromWallClock(w, this.clock.timeZone()));
    else this.draft.set(value);
  }

  // Pick a zone: live-apply per the zone-change mode.
  onTimeZone(tz: string): void {
    if (this.zoneChangeMode() === 'freeze') {
      // Keep the instant (pin "now" if live); relabel the draft into the new zone.
      this.clock.setMock(this.clock.now());
      this.clock.setTimeZone(tz);
    } else {
      // Keep the typed wall-clock; recompute the instant in the new zone.
      this.clock.setMock(instantFromWallClock(this.wall(), tz));
      this.clock.setTimeZone(tz);
    }
    this.seedDraft();
  }

  openTzPicker(): void {
    this.tzPickerOpen.set(true);
  }

  closeTzPicker(): void {
    this.tzPickerOpen.set(false);
  }

  toggleLive(): void {
    if (this.clock.isMocked()) {
      this.clock.clearMock();
      this.clock.clearTimeZone();
    } else {
      this.clock.setMock(this.clock.now());
    }
    this.seedDraft();
  }

  // Re-seed the datetime draft from the clock's instant, in the TM zone.
  private seedDraft(): void {
    this.draft.set(wallClockToInput(wallClockInZone(this.clock.now(), this.clock.timeZone())));
  }

  private scrubTo(instant: Date): void {
    this.clock.setMock(instant);
    this.seedDraft();
  }
}
