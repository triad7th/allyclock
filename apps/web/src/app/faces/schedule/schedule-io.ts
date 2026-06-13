import type { ScheduleSegment } from './schedule-formatter';

// Versioned envelope for exported schedule segment data. The version lets us
// evolve the on-disk shape later without misreading old files.
export interface ScheduleExport {
  version: 1;
  segments: ScheduleSegment[];
}

const TIME_RE = /^([01]\d|2[0-4]):[0-5]\d$/;

function isSegment(value: unknown): value is ScheduleSegment {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s['pixelStart'] === 'number' &&
    typeof s['pixelEnd'] === 'number' &&
    typeof s['timeStart'] === 'string' &&
    typeof s['timeEnd'] === 'string' &&
    TIME_RE.test(s['timeStart']) &&
    TIME_RE.test(s['timeEnd'])
  );
}

// Serialize segments to a pretty-printed JSON string for download/sharing.
export function serializeSegments(segments: ScheduleSegment[]): string {
  const payload: ScheduleExport = { version: 1, segments };
  return JSON.stringify(payload, null, 2);
}

// Parse and validate an exported JSON string back into segments. Returns null
// when the input is malformed, the wrong version, or contains invalid segments.
export function parseSegments(json: string): ScheduleSegment[] | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;
  const segments = obj['segments'];
  if (obj['version'] !== 1 || !Array.isArray(segments)) return null;
  if (segments.length === 0 || !segments.every(isSegment)) return null;
  return segments as ScheduleSegment[];
}
