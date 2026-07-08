import { Injectable, OnDestroy, computed, signal } from '@angular/core';
import { TimeMachine } from '@allyworld/alloy-time';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval

// Signals adapter over the shared TimeMachine model (@allyworld/alloy-time):
// the model owns mock state, persistence, and restore validation; this service
// adds the ticking real clock and Angular reactivity.
@Injectable({
  providedIn: 'root',
})
export class ClockService implements OnDestroy {
  private readonly machine = new TimeMachine({
    localZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    storage: safeLocalStorage(),
    namespace: 'allyclock', // preserves the pre-Alloy storage keys
  });

  // Real wall-clock time, ticking ~30fps.
  private readonly realNow = signal(new Date());

  // Reactive mirrors of the machine's mock state.
  private readonly mockNow = signal<Date | null>(this.machine.mock);
  private readonly mockTimeZone = signal<string | null>(this.machine.mockTimeZone);

  // The time every face observes: the mocked instant if set, otherwise live.
  readonly now = computed(() => this.mockNow() ?? this.realNow());

  // The active zone every "primary" face uses: the mocked zone if set, else local.
  readonly timeZone = computed(() => this.mockTimeZone() ?? this.machine.timeZone());

  // Whether the Time Machine is currently overriding the clock (time or zone).
  readonly isMocked = computed(() => this.mockNow() !== null || this.mockTimeZone() !== null);

  // The current mock instant, or null when live.
  readonly mock = this.mockNow.asReadonly();

  // The current mocked zone, or null when following local (for rollback).
  readonly mockTz = this.mockTimeZone.asReadonly();

  private readonly intervalId = setInterval(() => this.realNow.set(new Date()), TICK_MS);

  // Freeze the clock at the given instant.
  setMock(date: Date): void {
    this.machine.setMock(date);
    this.mockNow.set(this.machine.mock);
  }

  // Return to live time.
  clearMock(): void {
    this.machine.clearMock();
    this.mockNow.set(null);
  }

  // Override the active zone; selecting the local zone means "follow local".
  setTimeZone(tz: string): void {
    this.machine.setTimeZone(tz);
    this.mockTimeZone.set(this.machine.mockTimeZone);
  }

  // Return to the device's local zone.
  clearTimeZone(): void {
    this.machine.clearTimeZone();
    this.mockTimeZone.set(null);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}

// localStorage when available; null in restricted contexts (SSR, some private
// modes throw on ACCESS, not just on write).
function safeLocalStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
