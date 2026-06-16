import type { ScheduleSegment } from './schedule-formatter';

export interface SchedulePreset {
  id: string;
  name: string;
  segments: ScheduleSegment[];
  // True when an image blob exists in IndexedDB under `image:<id>`. When false,
  // the face falls back to the bundled default image.
  hasImage: boolean;
}

export interface ScheduleState {
  presets: SchedulePreset[];
  activePresetId: string;
}

// Stable id + name for the seeded/migrated default preset.
export const DEFAULT_PRESET_ID = 'default';
export const DEFAULT_PRESET_NAME = 'Summer Break';

// localStorage key for the preset list + active id.
export const PRESETS_KEY = 'allyclock.schedule.presets';
// Legacy single-schedule keys, migrated then removed.
export const LEGACY_SEGMENTS_KEY = 'allyclock.schedule';
export const LEGACY_IMAGE_KEY = 'image';
