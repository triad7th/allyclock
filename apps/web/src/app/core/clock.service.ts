import { Injectable, OnDestroy, computed, signal } from '@angular/core';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval
const MOCK_KEY = 'allyclock.clock.mock';
const TZ_KEY = 'allyclock.clock.tz';

@Injectable({
  providedIn: 'root',
})
export class ClockService implements OnDestroy {
  // Real wall-clock time, ticking ~30fps.
  private readonly realNow = signal(new Date());

  // Time Machine override. When set, the clock is frozen at this instant and
  // every face reads it instead of the real time. Null means "live".
  // Restored from localStorage so a set mock survives a page refresh.
  private readonly mockNow = signal<Date | null>(restoreMock());

  // Time Machine time-zone override. When set, the "primary" faces (Fullscreen,
  // Daily Schedule) read this IANA zone instead of the device's local zone.
  // Null means "follow local". Restored from localStorage like the mock instant.
  private readonly mockTimeZone = signal<string | null>(restoreTimeZone());
  private readonly localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // The time every face observes: the mocked instant if set, otherwise live.
  readonly now = computed(() => this.mockNow() ?? this.realNow());

  // The active zone every "primary" face uses: the mocked zone if set, else local.
  readonly timeZone = computed(() => this.mockTimeZone() ?? this.localTimeZone);

  // Whether the Time Machine is currently overriding the clock (time or zone).
  readonly isMocked = computed(() => this.mockNow() !== null || this.mockTimeZone() !== null);

  // The current mock instant, or null when live.
  readonly mock = this.mockNow.asReadonly();

  // The current mocked zone, or null when following local (for rollback).
  readonly mockTz = this.mockTimeZone.asReadonly();

  private readonly intervalId = setInterval(() => this.realNow.set(new Date()), TICK_MS);

  // Freeze the clock at the given instant.
  setMock(date: Date): void {
    this.mockNow.set(date);
    try {
      localStorage.setItem(MOCK_KEY, date.toISOString());
    } catch {
      // localStorage unavailable (e.g. private browsing): keep the in-memory value
    }
  }

  // Return to live time.
  clearMock(): void {
    this.mockNow.set(null);
    try {
      localStorage.removeItem(MOCK_KEY);
    } catch {
      // localStorage unavailable: the in-memory value is already cleared
    }
  }

  // Override the active zone with the given IANA zone. Selecting the device's
  // local zone is treated as "follow local" (live), so it isn't a mock.
  setTimeZone(tz: string): void {
    if (tz === this.localTimeZone) {
      this.clearTimeZone();
      return;
    }
    this.mockTimeZone.set(tz);
    try {
      localStorage.setItem(TZ_KEY, tz);
    } catch {
      // localStorage unavailable (e.g. private browsing): keep the in-memory value
    }
  }

  // Return to the device's local zone.
  clearTimeZone(): void {
    this.mockTimeZone.set(null);
    try {
      localStorage.removeItem(TZ_KEY);
    } catch {
      // localStorage unavailable: the in-memory value is already cleared
    }
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}

// Restore a persisted mock instant, or null when none/invalid is stored.
function restoreMock(): Date | null {
  try {
    const stored = localStorage.getItem(MOCK_KEY);
    if (stored) {
      const date = new Date(stored);
      if (!isNaN(date.getTime())) return date;
    }
  } catch {
    // localStorage unavailable: fall through to live time
  }
  return null;
}

// Restore a persisted mock zone, or null when none/invalid is stored. A zone is
// usable only if Intl accepts it, so a stale or malformed value is ignored.
function restoreTimeZone(): string | null {
  try {
    const stored = localStorage.getItem(TZ_KEY);
    if (stored) {
      new Intl.DateTimeFormat('en-US', { timeZone: stored });
      return stored;
    }
  } catch {
    // localStorage unavailable, or stored value is not a usable IANA zone
  }
  return null;
}
