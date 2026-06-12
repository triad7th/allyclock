import { ScheduleSegment } from './schedule-formatter';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="1000">
  <rect x="0" y="0" width="400" height="375" fill="#0d1b2a"/>
  <text x="200" y="180" text-anchor="middle" fill="#4a7fa5" font-size="28" font-family="sans-serif">Sleep</text>
  <text x="200" y="215" text-anchor="middle" fill="#4a7fa5" font-size="18" font-family="sans-serif">00:00 – 09:00</text>
  <rect x="0" y="375" width="400" height="150" fill="#2a1a0a"/>
  <text x="200" y="447" text-anchor="middle" fill="#c87941" font-size="24" font-family="sans-serif">Work Morning</text>
  <text x="200" y="477" text-anchor="middle" fill="#c87941" font-size="16" font-family="sans-serif">09:00 – 12:00</text>
  <rect x="0" y="525" width="400" height="75" fill="#0a2a0a"/>
  <text x="200" y="566" text-anchor="middle" fill="#4ab841" font-size="18" font-family="sans-serif">Lunch 12:00 – 13:00</text>
  <rect x="0" y="600" width="400" height="150" fill="#2a1a0a"/>
  <text x="200" y="672" text-anchor="middle" fill="#c87941" font-size="24" font-family="sans-serif">Work Afternoon</text>
  <text x="200" y="702" text-anchor="middle" fill="#c87941" font-size="16" font-family="sans-serif">13:00 – 18:00</text>
  <rect x="0" y="750" width="400" height="150" fill="#1a0a2a"/>
  <text x="200" y="822" text-anchor="middle" fill="#9841c8" font-size="24" font-family="sans-serif">Evening</text>
  <text x="200" y="852" text-anchor="middle" fill="#9841c8" font-size="16" font-family="sans-serif">18:00 – 21:00</text>
  <rect x="0" y="900" width="400" height="100" fill="#0d1b2a"/>
  <text x="200" y="953" text-anchor="middle" fill="#4a7fa5" font-size="18" font-family="sans-serif">Night 21:00 – 24:00</text>
</svg>`;

export const DEFAULT_IMAGE_SRC =
  'data:image/svg+xml,' + encodeURIComponent(svg);

export const DEFAULT_SEGMENTS: ScheduleSegment[] = [
  { pixelStart: 0, pixelEnd: 375, timeStart: '00:00', timeEnd: '09:00' },
  { pixelStart: 375, pixelEnd: 525, timeStart: '09:00', timeEnd: '12:00' },
  { pixelStart: 525, pixelEnd: 600, timeStart: '12:00', timeEnd: '13:00' },
  { pixelStart: 600, pixelEnd: 750, timeStart: '13:00', timeEnd: '18:00' },
  { pixelStart: 750, pixelEnd: 900, timeStart: '18:00', timeEnd: '21:00' },
  { pixelStart: 900, pixelEnd: 1000, timeStart: '21:00', timeEnd: '24:00' },
];
