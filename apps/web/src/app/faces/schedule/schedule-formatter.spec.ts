import { describe, it, expect } from 'vitest';
import { activeSegment, currentPixelY } from './schedule-formatter';
import type { ScheduleSegment } from './schedule-formatter';

// new Date('...T...:...') without Z = local time, getHours() is deterministic
const at = (h: number, m: number, s = 0) =>
  new Date(
    `2026-06-11T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
  );

const SEGS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '10:00' },
  { pixelStart: 500, pixelEnd: 700, timeStart: '10:00', timeEnd: '14:00' },
  { pixelStart: 700, pixelEnd: 1000, timeStart: '14:00', timeEnd: '24:00' },
];

describe('currentPixelY', () => {
  it('returns pixelStart at the exact start of a segment', () => {
    expect(currentPixelY(at(10, 0), SEGS)).toBe(500);
  });

  it('interpolates at the midpoint of a segment', () => {
    // 10:00–14:00 is 240 min, midpoint at 12:00 = 120 min in
    // progress = 120/240 = 0.5, pixelY = 500 + 0.5 * 200 = 600
    expect(currentPixelY(at(12, 0), SEGS)).toBeCloseTo(600);
  });

  it('returns pixelEnd at the exact end of the last segment', () => {
    // 24:00 = midnight next day = 0h0m clamp-after
    expect(currentPixelY(at(23, 59, 59), SEGS)).toBeCloseTo(1000, 0);
  });

  it('clamps to pixelStart of first segment when time is before all segments', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(currentPixelY(at(5, 0), lateSegs)).toBe(200);
  });

  it('clamps to pixelEnd of last segment when time is after all segments', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(currentPixelY(at(22, 0), earlySegs)).toBe(400);
  });

  it('handles single-segment: returns midpoint at midtime', () => {
    const single: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 1000, timeStart: '00:00', timeEnd: '24:00' },
    ];
    // 12:00 = 720 min, progress = 720/1440 = 0.5, pixelY = 500
    expect(currentPixelY(at(12, 0), single)).toBeCloseTo(500);
  });

  it('returns 0 for empty segments', () => {
    expect(currentPixelY(at(12, 0), [])).toBe(0);
  });
});

describe('activeSegment', () => {
  it('returns the segment containing the current time', () => {
    expect(activeSegment(at(11, 0), SEGS)).toEqual(SEGS[1]);
  });

  it('clamps to first segment when before all', () => {
    const lateSegs: ScheduleSegment[] = [
      { pixelStart: 200, pixelEnd: 800, timeStart: '08:00', timeEnd: '20:00' },
    ];
    expect(activeSegment(at(5, 0), lateSegs)).toEqual(lateSegs[0]);
  });

  it('clamps to last segment when after all', () => {
    const earlySegs: ScheduleSegment[] = [
      { pixelStart: 0, pixelEnd: 400, timeStart: '06:00', timeEnd: '18:00' },
    ];
    expect(activeSegment(at(22, 0), earlySegs)).toEqual(earlySegs[0]);
  });

  it('returns first segment for empty array', () => {
    expect(activeSegment(at(12, 0), [])).toBeNull();
  });
});
