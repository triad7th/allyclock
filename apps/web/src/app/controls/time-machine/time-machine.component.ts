import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ClockService } from '../../services/clock.service';

const HIDE_DELAY_MS = 4000;

// Format a Date as the local value a <input type="datetime-local"> expects.
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

// Parse a datetime-local value (interpreted as local time) into a Date.
function fromLocalInput(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

@Component({
  selector: 'app-time-machine',
  templateUrl: './time-machine.component.html',
  styleUrl: './time-machine.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class TimeMachineComponent implements OnInit, OnDestroy {
  private readonly clock = inject(ClockService);

  readonly isMocked = this.clock.isMocked;
  readonly panelOpen = signal(false);
  readonly visible = signal(true);
  readonly draft = signal('');

  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.armHideTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
  }

  reveal(): void {
    this.visible.set(true);
    this.armHideTimer();
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.panelOpen.set(false);
      return;
    }
    // Seed the picker with whatever the clock currently reads.
    this.draft.set(toLocalInput(this.clock.now()));
    this.panelOpen.set(true);
  }

  apply(): void {
    const date = fromLocalInput(this.draft());
    if (!date) return;
    this.clock.setMock(date);
    this.panelOpen.set(false);
  }

  goLive(): void {
    this.clock.clearMock();
    this.panelOpen.set(false);
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      // Keep the button on screen while the picker is open.
      if (!this.panelOpen()) this.visible.set(false);
    }, HIDE_DELAY_MS);
  }
}
