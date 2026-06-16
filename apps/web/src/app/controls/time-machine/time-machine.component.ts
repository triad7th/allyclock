import { Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { AUTO_HIDE_MS } from '../../config/animation-timing';
import { ClockService } from '../../services/clock.service';
import { IconButtonComponent } from '../../ui/icon-button/icon-button.component';
import { NavHeaderComponent } from '../../ui/nav-header/nav-header.component';
import { SheetComponent } from '../../ui/sheet/sheet.component';

const MS_PER_DAY = 86400000;

// Format a Date as the local value a <input type="datetime-local"> expects.
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Parse a datetime-local value (interpreted as local time) into a Date.
function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Curated zones for the rare runtime without Intl.supportedValuesOf, spanning the
// common offsets so the picker is still useful.
const FALLBACK_TIME_ZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Australia/Sydney',
];

// All selectable IANA zones: the platform's full list when available, else the
// curated fallback. Either way the device's local zone is guaranteed present.
function buildTimeZones(localZone: string): string[] {
  const base =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES;
  return base.includes(localZone) ? base : [localZone, ...base];
}

export interface TimeZoneOption {
  id: string;
  label: string;
  offset: number; // minutes east of UTC, for sorting
}

// Current UTC offset (in minutes) for a zone, parsed from Intl's longOffset.
function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0; // bare "GMT" === UTC
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// "+09:00" / "−07:00" (U+2212 minus, matching the rest of the app).
function formatOffset(min: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = min < 0 ? '−' : '+';
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Picker options: each zone labelled with its current GMT offset, sorted by
// offset (numeric) then zone name. Built lazily (it scans every IANA zone).
function buildTimeZoneOptions(localZone: string, at: Date): TimeZoneOption[] {
  return buildTimeZones(localZone)
    .map((id) => {
      const offset = zoneOffsetMinutes(id, at);
      return { id, offset, label: `${id}  ${formatOffset(offset)}` };
    })
    .sort((a, b) => a.offset - b.offset || a.id.localeCompare(b.id));
}

// 1-based day of the year (Jan 1 === 1). Rounded so DST shifts don't bias it.
function dayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0).getTime();
  return Math.round((date.getTime() - startOfYear) / MS_PER_DAY);
}

@Component({
  selector: 'app-time-machine',
  imports: [IconButtonComponent, NavHeaderComponent, SheetComponent],
  templateUrl: './time-machine.component.html',
  styleUrl: './time-machine.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class TimeMachineComponent implements OnInit, OnDestroy {
  private readonly clock = inject(ClockService);

  readonly isMocked = this.clock.isMocked;
  readonly panelOpen = signal(false);
  readonly visible = signal(true);

  private readonly sheet = viewChild(SheetComponent);

  // Selectable zones for the Time Zone field (each labelled with its GMT offset,
  // sorted by offset then name). Built lazily on first open — it scans every
  // IANA zone — and always includes the active zone.
  readonly timeZoneOptions = signal<TimeZoneOption[]>([]);

  // The drafted zone, mirroring `draft` for the time. Seeded on open.
  readonly tzDraft = signal(this.clock.timeZone());

  // Searchable time-zone picker: when open it replaces the controls with a
  // search box + filtered list. Filtering matches the labelled "id  ±hh:mm".
  readonly tzPickerOpen = signal(false);
  readonly tzQuery = signal('');
  readonly filteredZones = computed(() => {
    const q = this.tzQuery().trim().toLowerCase();
    const all = this.timeZoneOptions();
    return q ? all.filter((z) => z.label.toLowerCase().includes(q)) : all;
  });
  readonly activeZoneLabel = computed(
    () => this.timeZoneOptions().find((z) => z.id === this.tzDraft())?.label ?? this.tzDraft(),
  );


  // Canonical draft as a datetime-local string; the text input and both
  // sliders are all derived from it so they stay in sync while scrubbing.
  readonly draft = signal('');

  private readonly draftDate = computed(() => fromLocalInput(this.draft()) ?? new Date(0));
  readonly dayOfYear = computed(() => dayOfYear(this.draftDate()));
  readonly maxDayOfYear = computed(() => (isLeapYear(this.draftDate().getFullYear()) ? 366 : 365));
  readonly minuteOfDay = computed(
    () => this.draftDate().getHours() * 60 + this.draftDate().getMinutes(),
  );
  readonly dayLabel = computed(() =>
    this.draftDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  );
  readonly timeLabel = computed(() => toLocalInput(this.draftDate()).slice(11));

  // Slider progress (0–100%) driving the iOS blue minimum-track fill.
  readonly dayFillPercent = computed(() => {
    const max = this.maxDayOfYear();
    return max > 1 ? ((this.dayOfYear() - 1) / (max - 1)) * 100 : 0;
  });
  readonly timeFillPercent = computed(() => (this.minuteOfDay() / 1439) * 100);

  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.armHideTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
  }

  reveal(): void {
    this.visible.set(true);
    this.armHideTimer();
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.cancel();
      return;
    }
    // Seed the picker with whatever the clock currently reads.
    this.draft.set(toLocalInput(this.clock.now()));
    this.tzDraft.set(this.clock.timeZone());
    // Build the labelled/sorted zone list once, on first open.
    if (this.timeZoneOptions().length === 0) {
      this.timeZoneOptions.set(buildTimeZoneOptions(this.clock.timeZone(), new Date()));
    }
    // Always start on the controls, not the zone-search view.
    this.tzPickerOpen.set(false);
    this.panelOpen.set(true);
  }

  // Close the panel, accepting the live-scrubbed state. The X is "accept and
  // close" — whatever the user set is kept. Backdrop + Escape are owned by
  // <app-sheet> and arrive as (closed), which also keeps the scrubbed state.
  cancel(): void {
    this.sheet()?.close();
  }

  // Drag the day slider: keep the time, move to the chosen day of the year.
  onDaySlider(value: string): void {
    const base = this.draftDate();
    const next = new Date(base.getFullYear(), 0, Number(value), base.getHours(), base.getMinutes());
    this.scrubTo(next);
  }

  // Drag the time slider (a 0–1439 minute-of-day "progress bar"): keep the date.
  onTimeSlider(value: string): void {
    const minutes = Number(value);
    const next = new Date(this.draftDate());
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    this.scrubTo(next);
  }

  // Edit the date & time field: scrub the clock live too, so the change takes
  // effect immediately instead of waiting for a slider move.
  onDateTime(value: string): void {
    const date = fromLocalInput(value);
    if (date) this.scrubTo(date);
    else this.draft.set(value);
  }

  // Pick a zone: live-apply it like the sliders/datetime so faces shift now.
  onTimeZone(tz: string): void {
    this.tzDraft.set(tz);
    this.clock.setTimeZone(tz);
  }

  // Searchable Time Zone picker (a view that replaces the controls while open).
  openTzPicker(): void {
    this.tzQuery.set('');
    this.tzPickerOpen.set(true);
  }

  closeTzPicker(): void {
    this.tzPickerOpen.set(false);
  }

  pickTimeZone(id: string): void {
    this.onTimeZone(id);
    this.tzPickerOpen.set(false);
    this.tzQuery.set('');
  }

  apply(): void {
    const date = fromLocalInput(this.draft());
    if (!date) return;
    this.clock.setMock(date);
    this.clock.setTimeZone(this.tzDraft());
    this.sheet()?.close();
  }

  // Live/Mock switch: toggle between following the live timer and freezing at
  // the current instant. Does NOT close the panel; re-syncs the editor (datetime
  // + zone combobox) to the resulting state — including the zone back to local.
  toggleLive(): void {
    if (this.clock.isMocked()) {
      this.clock.clearMock();
      this.clock.clearTimeZone();
    } else {
      this.clock.setMock(this.clock.now());
    }
    this.draft.set(toLocalInput(this.clock.now()));
    this.tzDraft.set(this.clock.timeZone());
  }

  // Update the draft and scrub the live clock to it so faces move as you drag.
  private scrubTo(date: Date): void {
    this.draft.set(toLocalInput(date));
    this.clock.setMock(date);
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      // Keep the button on screen while the picker is open.
      if (!this.panelOpen()) this.visible.set(false);
    }, AUTO_HIDE_MS);
  }
}
