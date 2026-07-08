import { describe, it, expect } from 'vitest';
import { bigTime, dateTZ, dateParts, precise } from './clock-formatter';

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

describe('dateTZ', () => {
  it('joins the long date and offset with a middle dot', () => {
    expect(dateTZ(date, 'en-US', 'America/Los_Angeles')).toBe('June 10, 2026 · GMT−07:00');
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
