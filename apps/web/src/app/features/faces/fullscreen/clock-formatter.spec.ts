import { describe, it, expect } from 'vitest';
import {
  bigTime,
  compactOffset,
  dateTZ,
  dateParts,
  gmtOffset,
  precise,
  zoneCity,
} from './clock-formatter';

// 2026-06-11T03:09:05.270Z = 8:09:05 PM June 10 in Los Angeles (PDT), 12:09 PM in Seoul.
const date = new Date('2026-06-11T03:09:05.270Z');

describe('bigTime', () => {
  it('formats 12-hour locales with an AM/PM marker', () => {
    expect(bigTime(date, 'en-US', 'America/Los_Angeles')).toEqual({
      digits: '8:09',
      ampm: 'PM',
      seconds: '05',
    });
  });

  it('formats 24-hour locales without a marker', () => {
    expect(bigTime(date, 'en-GB', 'UTC')).toEqual({ digits: '3:09', ampm: null, seconds: '05' });
  });

  it('uses localized day-period symbols', () => {
    expect(bigTime(date, 'ko-KR', 'Asia/Seoul')).toEqual({
      digits: '12:09',
      ampm: '오후',
      seconds: '05',
    });
  });

  it('bigTime includes zero-padded seconds', () => {
    const d = new Date('2026-06-20T22:50:07-07:00');
    expect(bigTime(d, 'en-US', 'America/Los_Angeles').seconds).toBe('07');
  });
});

describe('precise', () => {
  it('formats 24h time with hundredths', () => {
    expect(precise(date, 'UTC')).toBe('03:09:05.27');
  });

  it('zero-pads hundredths', () => {
    expect(precise(new Date('2026-06-11T03:09:05.051Z'), 'UTC')).toBe('03:09:05.05');
  });
});

describe('gmtOffset', () => {
  it('renders negative offsets with a minus sign (U+2212)', () => {
    expect(gmtOffset(date, 'America/Los_Angeles')).toBe('GMT−07:00');
  });

  it('renders UTC as +00:00', () => {
    expect(gmtOffset(date, 'UTC')).toBe('GMT+00:00');
  });

  it('renders positive offsets', () => {
    expect(gmtOffset(date, 'Asia/Seoul')).toBe('GMT+09:00');
  });
});

describe('compactOffset', () => {
  it('drops the GMT prefix, leading zero, and whole-hour minutes', () => {
    expect(compactOffset(date, 'America/Los_Angeles')).toBe('−7');
  });

  it('renders UTC as +0', () => {
    expect(compactOffset(date, 'UTC')).toBe('+0');
  });

  it('renders positive whole-hour offsets with a plus sign', () => {
    expect(compactOffset(date, 'Asia/Seoul')).toBe('+9');
  });

  it('keeps the minutes for sub-hour offsets', () => {
    expect(compactOffset(date, 'Asia/Kolkata')).toBe('+5:30');
  });

  it('keeps the minutes for negative sub-hour offsets', () => {
    expect(compactOffset(date, 'America/St_Johns')).toBe('−2:30');
  });
});

describe('dateTZ', () => {
  it('joins the long date and offset with a middle dot', () => {
    expect(dateTZ(date, 'en-US', 'America/Los_Angeles')).toBe('June 10, 2026 · GMT−07:00');
  });
});

describe('zoneCity', () => {
  it('uppercases the city segment with spaces for underscores', () => {
    expect(zoneCity('America/Los_Angeles', false)).toBe('LOS ANGELES');
  });

  it('abbreviates a multi-word city to its initials when a flag is shown', () => {
    expect(zoneCity('America/Los_Angeles', true)).toBe('LA');
    expect(zoneCity('America/New_York', true)).toBe('NY');
  });

  it('abbreviates a single-word city to its first three letters', () => {
    expect(zoneCity('Europe/London', true)).toBe('LON');
    expect(zoneCity('Asia/Seoul', true)).toBe('SEO');
  });

  it('uses the deepest path segment for nested zones', () => {
    expect(zoneCity('America/Argentina/Buenos_Aires', false)).toBe('BUENOS AIRES');
    expect(zoneCity('America/Argentina/Buenos_Aires', true)).toBe('BA');
  });

  it('handles UTC with or without abbreviation', () => {
    expect(zoneCity('UTC', false)).toBe('UTC');
    expect(zoneCity('UTC', true)).toBe('UTC');
  });

  it('returns no city for fixed-offset zones (the globe offset conveys them)', () => {
    expect(zoneCity('-08:00', true)).toBe('');
    expect(zoneCity('+05:30', false)).toBe('');
  });
});

describe('dateParts', () => {
  it('returns weekday, month, day, gmt for a zone', () => {
    const p = dateParts(new Date('2026-06-17T16:41:00Z'), 'en-US', 'America/Los_Angeles');
    expect(p.weekday).toBe('Wed');
    expect(p.month).toBe('Jun');
    expect(p.day).toBe('17');
    expect(p.gmt).toBe('−7');
  });
});
