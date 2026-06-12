import { Injectable, OnDestroy, signal } from '@angular/core';

const TICK_MS = 33; // ~30fps, matching the iOS TimelineView interval

@Injectable({
  providedIn: 'root',
})
export class ClockService implements OnDestroy {
  readonly now = signal(new Date());

  private readonly intervalId = setInterval(() => this.now.set(new Date()), TICK_MS);

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }
}
