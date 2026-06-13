export interface ScheduleSegment {
  pixelStart: number;
  pixelEnd: number;
  timeStart: string; // "HH:MM" 24-hour
  timeEnd: string; // "HH:MM" 24-hour
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

export function currentPixelY(date: Date, segments: ScheduleSegment[]): number {
  if (segments.length === 0) return 0;

  const now = nowMinutes(date);
  const first = segments[0];
  const last = segments[segments.length - 1];

  if (now <= toMinutes(first.timeStart)) return first.pixelStart;
  if (now >= toMinutes(last.timeEnd)) return last.pixelEnd;

  const seg = segments.find((s) => now >= toMinutes(s.timeStart) && now < toMinutes(s.timeEnd));
  if (!seg) return last.pixelEnd;

  const segStartMin = toMinutes(seg.timeStart);
  const segEndMin = toMinutes(seg.timeEnd);
  const progress = (now - segStartMin) / (segEndMin - segStartMin);
  return seg.pixelStart + progress * (seg.pixelEnd - seg.pixelStart);
}

export function activeSegment(date: Date, segments: ScheduleSegment[]): ScheduleSegment | null {
  if (segments.length === 0) return null;

  const now = nowMinutes(date);
  const first = segments[0];
  const last = segments[segments.length - 1];

  if (now <= toMinutes(first.timeStart)) return first;
  if (now >= toMinutes(last.timeEnd)) return last;

  return segments.find((s) => now >= toMinutes(s.timeStart) && now < toMinutes(s.timeEnd)) ?? last;
}
