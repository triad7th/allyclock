import { describe, expect, it } from 'vitest';
import { parseSegments, serializeSegments } from './schedule-io';
import type { ScheduleSegment } from './schedule-formatter';

const SEGMENTS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 500, timeStart: '00:00', timeEnd: '12:00' },
  { pixelStart: 500, pixelEnd: 1000, timeStart: '12:00', timeEnd: '24:00' },
];

describe('schedule-io', () => {
  it('round-trips segments through serialize/parse', () => {
    const json = serializeSegments(SEGMENTS);
    expect(parseSegments(json)).toEqual(SEGMENTS);
  });

  it('writes a versioned envelope', () => {
    expect(JSON.parse(serializeSegments(SEGMENTS))).toEqual({ version: 1, segments: SEGMENTS });
  });

  it('returns null for invalid JSON', () => {
    expect(parseSegments('not json')).toBeNull();
  });

  it('returns null when version is wrong', () => {
    expect(parseSegments(JSON.stringify({ version: 2, segments: SEGMENTS }))).toBeNull();
  });

  it('returns null when segments are empty', () => {
    expect(parseSegments(JSON.stringify({ version: 1, segments: [] }))).toBeNull();
  });

  it('returns null when a segment has a malformed time', () => {
    const bad = [{ pixelStart: 0, pixelEnd: 500, timeStart: '25:00', timeEnd: '12:00' }];
    expect(parseSegments(JSON.stringify({ version: 1, segments: bad }))).toBeNull();
  });

  it('returns null when a segment is missing a field', () => {
    const bad = [{ pixelStart: 0, pixelEnd: 500, timeStart: '00:00' }];
    expect(parseSegments(JSON.stringify({ version: 1, segments: bad }))).toBeNull();
  });
});
