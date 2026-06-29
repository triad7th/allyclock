import { zoneOffsetMinutes } from '@core/zone-catalog';

export interface BigTime {
  digits: string;
  ampm: string | null;
  seconds: string;
}

export function bigTime(date: Date, locale: string, timeZone: string): BigTime {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
  }).formatToParts(date);

  const digits = parts
    .filter((part) => part.type === 'hour' || part.type === 'minute')
    .map((part) => part.value)
    .join(':');
  const ampm = parts.find((part) => part.type === 'dayPeriod')?.value ?? null;
  const seconds = parts.find((part) => part.type === 'second')?.value ?? '00';

  return { digits, ampm, seconds };
}

export function precise(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '00';
  const hundredths = Math.min(99, Math.round(date.getMilliseconds() / 10));
  return `${get('hour')}:${get('minute')}:${get('second')}.${String(hundredths).padStart(2, '0')}`;
}

export function dateTZ(date: Date, locale: string, timeZone: string): string {
  const datePart = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone }).format(date);
  return `${datePart} · ${gmtOffset(date, timeZone)}`;
}

export function gmtOffset(date: Date, timeZone: string): string {
  const name =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
  const normalized = name === 'GMT' ? 'GMT+00:00' : name;
  return normalized.replace('-', '−');
}

// Compact UTC offset for the date row's globe badge: sign + hours, appending
// ":mm" only when the zone isn't on a whole hour ("−7", "+9", "+5:30", "+0").
// The globe icon stands in for the "GMT" prefix. U+2212 minus, matching the app.
export function compactOffset(date: Date, timeZone: string): string {
  const min = zoneOffsetMinutes(timeZone, date);
  const sign = min < 0 ? '−' : '+';
  const abs = Math.abs(min);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `${sign}${hours}` : `${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

// City label derived from an IANA zone id: the last path segment, underscores
// spaced out and uppercased ("America/Los_Angeles" -> "LOS ANGELES"). When
// `abbreviate` is true (a country flag already supplies the locale), collapse a
// multi-word city to its initials, or a single word to its first three letters
// ("LOS ANGELES" -> "LA", "London" -> "LON", "UTC" -> "UTC").
export function zoneCity(timeZone: string, abbreviate: boolean): string {
  const city = (timeZone.split('/').pop() ?? timeZone).replace(/_/g, ' ');
  if (!abbreviate) return city.toUpperCase();
  const words = city.split(/[\s-]+/).filter(Boolean);
  const label = words.length > 1 ? words.map((w) => w[0]).join('') : city.slice(0, 3);
  return label.toUpperCase();
}

export interface DateParts { weekday: string; month: string; day: string; gmt: string; }

export function dateParts(date: Date, locale: string, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'short', month: 'short', day: 'numeric', timeZone,
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return { weekday: get('weekday'), month: get('month'), day: get('day'), gmt: compactOffset(date, timeZone) };
}
