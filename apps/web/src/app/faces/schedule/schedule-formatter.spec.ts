import { describe, it, expect } from 'vitest';
import { activeSegment, currentPixelY, framedWindow } from './schedule-formatter';
import type { ScheduleSegment } from './schedule-formatter';

// new Date('...T...:...') without Z = local time. Pairing each with the device's
// local zone keeps the existing assertions deterministic now that the formatter
// derives minutes-of-day in an explicit zone.
const at = (h: number, m: number, s = 0) =>
  new Date(
    `2026-06-11T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  );

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

const SEGS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '10:00' },
  { pixelStart: 500, pixelEnd: 700, timeStart: '10:00', timeEnd: '14:00' },
  { pixelStart: 700, pixelEnd: 1000, timeStart: '14:00', timeEnd: '24:00' },
];

describe('currentPixelY', () => {
  it('returns pixelStart at the exact start of a segment', () => {
    expect(currentPixelY(at(10, 0), SEGS, LOCAL_TZ)).toBe(500);
  });

  it('interpolates at the midpoint of a segment', () => {
    // 10:00–14:00 is 240 min, midpoint at 12:00 = 120 min in
    // progress = 120/240 = 0.5, pixelY = 500 + 0.5 * 200 = 600
    expect(currentPixelY(at(12, 0), SEGS, LOCAL_TZ)).toBeCloseTo(600);
  });

  it('returns pixelEnd at the exact end of the last segment', () => {
    // 24:00 = midnight next day = 0h0m clamp-after
    expect(currentPixelY(at(23, 59, 59), SEGS, LOCAL_TZ)).toBeCloseTo(1000, 0);
  });

  it('clamps to pixelStart of first segment when time is before all segments', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(currentPixelY(at(5, 0), lateSegs, LOCAL_TZ)).toBe(200);
  });

  it('clamps to pixelEnd of last segment when time is after all segments', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(currentPixelY(at(22, 0), earlySegs, LOCAL_TZ)).toBe(400);
  });

  it('handles single-segment: returns midpoint at midtime', () => {
    const single: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 1000, timeStart: '00:00', timeEnd: '24:00' },
    ];
    // 12:00 = 720 min, progress = 720/1440 = 0.5, pixelY = 500
    expect(currentPixelY(at(12, 0), single, LOCAL_TZ)).toBeCloseTo(500);
  });

  it('returns 0 for empty segments', () => {
    expect(currentPixelY(at(12, 0), [], LOCAL_TZ)).toBe(0);
  });

  it('places the same instant differently across zones', () => {
    // 12:00 UTC. In Asia/Seoul (UTC+9) that instant is 21:00, which lands in the
    // last segment, whereas in UTC it lands mid-day in the middle segment.
    const instant = new Date('2026-06-11T12:00:00.000Z');
    const inUtc = currentPixelY(instant, SEGS, 'UTC');
    const inSeoul = currentPixelY(instant, SEGS, 'Asia/Seoul');
    expect(inSeoul).not.toBeCloseTo(inUtc);
    expect(inUtc).toBeCloseTo(600); // 12:00 → middle segment midpoint
    expect(inSeoul).toBeCloseTo(910); // 21:00 → 7h into the 14:00–24:00 segment
  });
});

describe('activeSegment', () => {
  it('returns the segment containing the current time', () => {
    expect(activeSegment(at(11, 0), SEGS, LOCAL_TZ)).toEqual(SEGS[1]);
  });

  it('clamps to first segment when before all', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(activeSegment(at(5, 0), lateSegs, LOCAL_TZ)).toEqual(lateSegs[0]);
  });

  it('clamps to last segment when after all', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(activeSegment(at(22, 0), earlySegs, LOCAL_TZ)).toEqual(earlySegs[0]);
  });

  it('returns first segment for empty array', () => {
    expect(activeSegment(at(12, 0), [], LOCAL_TZ)).toBeNull();
  });

  it('selects a different active segment for the same instant across zones', () => {
    // 12:00 UTC → 21:00 in Asia/Seoul. UTC picks the middle segment; Seoul the last.
    const instant = new Date('2026-06-11T12:00:00.000Z');
    expect(activeSegment(instant, SEGS, 'UTC')).toEqual(SEGS[1]);
    expect(activeSegment(instant, SEGS, 'Asia/Seoul')).toEqual(SEGS[2]);
  });
});

describe('framedWindow', () => {
  const UNIFORM: ScheduleSegment[] = [
    { pixelStart: 0, pixelEnd: 100, timeStart: '00:00', timeEnd: '06:00' },
    { pixelStart: 100, pixelEnd: 200, timeStart: '06:00', timeEnd: '12:00' },
    { pixelStart: 200, pixelEnd: 300, timeStart: '12:00', timeEnd: '18:00' },
    { pixelStart: 300, pixelEnd: 400, timeStart: '18:00', timeEnd: '24:00' },
  ];

  it('frames all segments when they all fit, centered in the container', () => {
    // All 4 (height 400) fit in 1000; window top is 0 → (1000-400)/2 - 0 = 300.
    expect(framedWindow(UNIFORM, 0, 1, 1000).translateY).toBe(300);
  });

  it('frames a complete-segment window when only some fit', () => {
    // active 1 grows to window [1,2] (height 200) in 250; top is 100 →
    // (250-200)/2 - 100 = 25 - 100 = -75.
    expect(framedWindow(UNIFORM, 1, 1, 250).translateY).toBe(-75);
  });

  it('frames just the active segment when it is taller than the container', () => {
    // active 2 alone (height 100) exceeds 50; window stays [2], top 200 →
    // (50-100)/2 - 200 = -25 - 200 = -225.
    expect(framedWindow(UNIFORM, 2, 1, 50).translateY).toBe(-225);
  });

  it('returns 0 for empty segments', () => {
    expect(framedWindow([], 0, 1, 1000).translateY).toBe(0);
  });

  it('returns 0 when scale is 0', () => {
    expect(framedWindow(UNIFORM, 0, 0, 1000).translateY).toBe(0);
  });
});
