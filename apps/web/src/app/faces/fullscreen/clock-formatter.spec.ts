import { describe, it, expect } from 'vitest';
import { bigTime, dateTZ, dateParts, gmtOffset, minuteFraction, precise } from './clock-formatter';

// 2026-06-11T03:09:05.270Z = 8:09:05 PM June 10 in Los Angeles (PDT), 12:09 PM in Seoul.
const date = new Date('2026-06-11T03:09:05.270Z');

describe('bigTime', () => {
  it('formats 12-hour locales with an AM/PM marker', () => {
    expect(bigTime(date, 'en-US', 'America/Los_Angeles')).toEqual({
      digits: '8:09',
      ampm: 'PM',
    });
  });

  it('formats 24-hour locales without a marker', () => {
    expect(bigTime(date, 'en-GB', 'UTC')).toEqual({ digits: '3:09', ampm: null });
  });

  it('uses localized day-period symbols', () => {
    expect(bigTime(date, 'ko-KR', 'Asia/Seoul')).toEqual({
      digits: '12:09',
      ampm: '오후',
    });
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

describe('dateTZ', () => {
  it('joins the long date and offset with a middle dot', () => {
    expect(dateTZ(date, 'en-US', 'America/Los_Angeles')).toBe('June 10, 2026 · GMT−07:00');
  });
});

describe('minuteFraction', () => {
  it('is seconds(+ms)/60 of the current minute', () => {
    expect(minuteFraction(new Date('2026-06-17T09:41:30.000Z'))).toBeCloseTo(0.5, 3);
    expect(minuteFraction(new Date('2026-06-17T09:41:00.000Z'))).toBeCloseTo(0, 3);
  });
});

describe('dateParts', () => {
  it('returns weekday, month, day, gmt for a zone', () => {
    const p = dateParts(new Date('2026-06-17T16:41:00Z'), 'en-US', 'America/Los_Angeles');
    expect(p.weekday).toBe('Wed');
    expect(p.month).toBe('Jun');
    expect(p.day).toBe('17');
    expect(p.gmt).toBe('GMT−07:00');
  });
});
