import { Injectable } from '@angular/core';

export interface TimeZoneOption {
  id: string;
  label: string;
  offset: number; // minutes east of UTC, for sorting
}

// Curated zones for the rare runtime without Intl.supportedValuesOf.
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

export function buildTimeZones(localZone: string): string[] {
  const base =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : FALLBACK_TIME_ZONES;
  return base.includes(localZone) ? base : [localZone, ...base];
}

// Current UTC offset (minutes east of UTC) for a zone, parsed from Intl longOffset.
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0; // bare "GMT" === UTC
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

// "+09:00" / "−07:00" (U+2212 minus, matching the rest of the app).
export function formatOffset(min: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = min < 0 ? '−' : '+';
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Picker options: each zone labelled with its current GMT offset, sorted by
// offset then zone name.
export function buildTimeZoneOptions(localZone: string, at: Date): TimeZoneOption[] {
  return buildTimeZones(localZone)
    .map((id) => {
      const offset = zoneOffsetMinutes(id, at);
      return { id, offset, label: `${id}  ${formatOffset(offset)}` };
    })
    .sort((a, b) => a.offset - b.offset || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// App-wide cached zone catalog: the full-IANA scan runs once. Consumers (Time
// Machine, Settings picker) read the same list.
@Injectable({ providedIn: 'root' })
export class ZoneCatalog {
  private cached: TimeZoneOption[] | null = null;

  options(): TimeZoneOption[] {
    if (!this.cached) {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.cached = buildTimeZoneOptions(local, new Date());
    }
    return this.cached;
  }
}
