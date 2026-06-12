export interface BigTime {
  digits: string;
  ampm: string | null;
}

export function bigTime(date: Date, locale: string, timeZone: string): BigTime {
  const parts = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).formatToParts(date);

  const digits = parts
    .filter((part) => part.type === 'hour' || part.type === 'minute')
    .map((part) => part.value)
    .join(':');
  const ampm = parts.find((part) => part.type === 'dayPeriod')?.value ?? null;

  return { digits, ampm };
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
