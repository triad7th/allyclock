import { compactOffset, gmtOffset } from '@allyworld/alloy-time';

// zoneCity/compactOffset/gmtOffset moved to @allyworld/alloy-time; re-exported
// for this file's existing consumers (world-cards card, settings).
export { compactOffset, gmtOffset, zoneCity } from '@allyworld/alloy-time';

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

export interface DateParts {
  weekday: string;
  month: string;
  day: string;
  gmt: string;
}

export function dateParts(date: Date, locale: string, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone,
  }).formatToParts(date);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    weekday: get('weekday'),
    month: get('month'),
    day: get('day'),
    gmt: compactOffset(date, timeZone),
  };
}
