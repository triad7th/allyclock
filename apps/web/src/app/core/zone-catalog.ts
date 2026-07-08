import { Injectable } from '@angular/core';
import { buildTimeZoneOptions } from '@allyworld/alloy-time';
import type { TimeZoneOption } from '@allyworld/alloy-time';

// Pure zone API lives in @allyworld/alloy-time; this file re-exports it so
// app-internal `@core/zone-catalog` imports keep working, and keeps the
// app-side caching service (the full-IANA Intl scan is slow on the web).
export {
  buildSpecialZones,
  buildTimeZoneOptions,
  buildTimeZones,
  formatOffset,
  zoneOffsetMinutes,
} from '@allyworld/alloy-time';
export type { TimeZoneOption } from '@allyworld/alloy-time';

// App-wide cached zone catalog: the full-IANA scan runs once. Consumers (Time
// Machine, Settings picker) read the same list.
@Injectable({ providedIn: 'root' })
export class ZoneCatalog {
  private cached: TimeZoneOption[] | null = null;

  options(): TimeZoneOption[] {
    if (!this.cached) {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.cached = buildTimeZoneOptions(local, new Date());
    }
    return this.cached;
  }
}
