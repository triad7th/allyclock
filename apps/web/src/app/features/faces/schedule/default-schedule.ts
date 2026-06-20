import { ScheduleSegment } from './schedule-formatter';

// Default schedule image, served from public/ at the app root. Pixel
// coordinates in DEFAULT_SEGMENTS are in this image's natural pixel space
// (1086 x 1448).
export const DEFAULT_IMAGE_SRC = 'allyclock-schedule.png';

export const DEFAULT_SEGMENTS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 191, timeStart: '00:00', timeEnd: '09:00' },
  { pixelStart: 191, pixelEnd: 363, timeStart: '09:00', timeEnd: '12:00' },
  { pixelStart: 363, pixelEnd: 485, timeStart: '12:00', timeEnd: '13:00' },
  { pixelStart: 485, pixelEnd: 624, timeStart: '13:00', timeEnd: '14:00' },
  { pixelStart: 624, pixelEnd: 727, timeStart: '14:00', timeEnd: '15:00' },
  { pixelStart: 727, pixelEnd: 851, timeStart: '15:00', timeEnd: '16:00' },
  { pixelStart: 851, pixelEnd: 971, timeStart: '16:00', timeEnd: '17:00' },
  { pixelStart: 971, pixelEnd: 1073, timeStart: '17:00', timeEnd: '18:00' },
  { pixelStart: 1073, pixelEnd: 1448, timeStart: '18:00', timeEnd: '24:00' },
];
