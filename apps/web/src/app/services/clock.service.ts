import { Injectable, OnDestroy, computed, signal } from '@angular/core';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval
const MOCK_KEY = 'allyclock.clock.mock';

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

  // The time every face observes: the mocked instant if set, otherwise live.
  readonly now = computed(() => this.mockNow() ?? this.realNow());

  // Whether the Time Machine is currently overriding the clock.
  readonly isMocked = computed(() => this.mockNow() !== null);

  // The current mock instant, or null when live.
  readonly mock = this.mockNow.asReadonly();

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
