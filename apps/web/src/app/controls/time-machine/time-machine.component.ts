import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../services/clock.service';

const HIDE_DELAY_MS = 4000;
const MS_PER_DAY = 86400000;

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

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// 1-based day of the year (Jan 1 === 1). Rounded so DST shifts don't bias it.
function dayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0).getTime();
  return Math.round((date.getTime() - startOfYear) / MS_PER_DAY);
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

  // Canonical draft as a datetime-local string; the text input and both
  // sliders are all derived from it so they stay in sync while scrubbing.
  readonly draft = signal('');

  private readonly draftDate = computed(() => fromLocalInput(this.draft()) ?? new Date(0));
  readonly dayOfYear = computed(() => dayOfYear(this.draftDate()));
  readonly maxDayOfYear = computed(() => (isLeapYear(this.draftDate().getFullYear()) ? 366 : 365));
  readonly minuteOfDay = computed(
    () => this.draftDate().getHours() * 60 + this.draftDate().getMinutes(),
  );
  readonly dayLabel = computed(() =>
    this.draftDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  );
  readonly timeLabel = computed(() => toLocalInput(this.draftDate()).slice(11));

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

  // Drag the day slider: keep the time, move to the chosen day of the year.
  onDaySlider(value: string): void {
    const base = this.draftDate();
    const next = new Date(base.getFullYear(), 0, Number(value), base.getHours(), base.getMinutes());
    this.scrubTo(next);
  }

  // Drag the time slider (a 0–1439 minute-of-day "progress bar"): keep the date.
  onTimeSlider(value: string): void {
    const minutes = Number(value);
    const next = new Date(this.draftDate());
    next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    this.scrubTo(next);
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

  // Update the draft and scrub the live clock to it so faces move as you drag.
  private scrubTo(date: Date): void {
    this.draft.set(toLocalInput(date));
    this.clock.setMock(date);
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      // Keep the button on screen while the picker is open.
      if (!this.panelOpen()) this.visible.set(false);
    }, HIDE_DELAY_MS);
  }
}
