import { ScheduleSegment } from './schedule-formatter';

// Default schedule image, served from public/ at the app root. Pixel
// coordinates in DEFAULT_SEGMENTS are in this image's natural pixel space
// (1086 x 1448).
export const DEFAULT_IMAGE_SRC = 'allyclock-schedule.png';

export const DEFAULT_SEGMENTS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 199, timeStart: '00:00', timeEnd: '09:00' },
  { pixelStart: 199, pixelEnd: 366, timeStart: '09:00', timeEnd: '12:00' },
  { pixelStart: 366, pixelEnd: 487, timeStart: '12:00', timeEnd: '13:00' },
  { pixelStart: 487, pixelEnd: 624, timeStart: '13:00', timeEnd: '14:00' },
  { pixelStart: 624, pixelEnd: 735, timeStart: '14:00', timeEnd: '15:00' },
  { pixelStart: 735, pixelEnd: 855, timeStart: '15:00', timeEnd: '16:00' },
  { pixelStart: 855, pixelEnd: 969, timeStart: '16:00', timeEnd: '17:00' },
  { pixelStart: 969, pixelEnd: 1076, timeStart: '17:00', timeEnd: '18:00' },
  { pixelStart: 1076, pixelEnd: 1448, timeStart: '18:00', timeEnd: '24:00' },
];
