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

// Choose the vertical offset (in displayed px) that frames a window of COMPLETE
// segments around the active one, fit to the container height and centered, so
// no row is ever cut in half. Returns translateY for the image stage.
export function framedWindow(
  segments: ScheduleSegment[],
  activeIndex: number,
  scale: number,
  containerHeight: number,
): { translateY: number } {
  if (segments.length === 0 || scale <= 0) return { translateY: 0 };
  const i = Math.max(0, Math.min(activeIndex, segments.length - 1));
  const segHeight = (k: number) => (segments[k].pixelEnd - segments[k].pixelStart) * scale;
  let lo = i;
  let hi = i;
  let used = segHeight(i);
  // Grow outward (below first, then above) while whole segments still fit.
  let grew = true;
  while (grew) {
    grew = false;
    if (hi + 1 < segments.length && used + segHeight(hi + 1) <= containerHeight) {
      hi += 1;
      used += segHeight(hi);
      grew = true;
    }
    if (lo - 1 >= 0 && used + segHeight(lo - 1) <= containerHeight) {
      lo -= 1;
      used += segHeight(lo);
      grew = true;
    }
  }
  const topPx = segments[lo].pixelStart * scale;
  const windowHeight = (segments[hi].pixelEnd - segments[lo].pixelStart) * scale;
  // Center the complete-segment window in the container (clean letterbox margins).
  return { translateY: (containerHeight - windowHeight) / 2 - topPx };
}
