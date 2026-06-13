import { Injectable, OnDestroy, computed, signal } from '@angular/core';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval

@Injectable({
  providedIn: 'root',
})
export class ClockService implements OnDestroy {
  // Real wall-clock time, ticking ~30fps.
  private readonly realNow = signal(new Date());

  // Time Machine override. When set, the clock is frozen at this instant and
  // every face reads it instead of the real time. Null means "live".
  private readonly mockNow = signal<Date | null>(null);

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
  }

  // Return to live time.
  clearMock(): void {
    this.mockNow.set(null);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
