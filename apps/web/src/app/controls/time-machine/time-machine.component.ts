import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ClockService } from '../../services/clock.service';
import { IconComponent } from '../../ui/icon/icon.component';

const HIDE_DELAY_MS = 4000;
const MS_PER_DAY = 86400000;
// Matches the slide-down/fade-out animation duration in the sheet SCSS.
const CLOSE_MS = 280;

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
  imports: [IconComponent],
  templateUrl: './time-machine.component.html',
  styleUrl: './time-machine.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown)': 'onDocumentKeyDown($event)',
  },
})
export class TimeMachineComponent implements OnInit, OnDestroy {
  private readonly clock = inject(ClockService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly isMocked = this.clock.isMocked;
  readonly panelOpen = signal(false);
  readonly panelClosing = signal(false);
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

  // Clock state captured when the panel opened, so dismissing without applying
  // can roll back any live scrubbing. null means "was live".
  private mockBeforeOpen: Date | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.armHideTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.closeTimer);
  }

  reveal(): void {
    this.visible.set(true);
    this.armHideTimer();
  }

  togglePanel(): void {
    if (this.panelOpen()) {
      this.cancel();
      return;
    }
    // Remember the clock state so an outside click / Escape can roll back.
    this.mockBeforeOpen = this.clock.mock();
    // Seed the picker with whatever the clock currently reads.
    this.draft.set(toLocalInput(this.clock.now()));
    this.panelClosing.set(false);
    this.panelOpen.set(true);
  }

  // Dismiss without committing: restore the pre-open clock state now, then
  // play the slide-out before unmounting the sheet.
  cancel(): void {
    if (!this.panelOpen() || this.panelClosing()) return;
    if (this.mockBeforeOpen) {
      this.clock.setMock(this.mockBeforeOpen);
    } else {
      this.clock.clearMock();
    }
    this.beginClose();
  }

  onDocumentPointerDown(event: Event): void {
    this.reveal();
    if (!this.panelOpen()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.cancel();
    }
  }

  onDocumentKeyDown(event: KeyboardEvent): void {
    this.reveal();
    if (this.panelOpen() && event.key === 'Escape') {
      this.cancel();
    }
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
    this.beginClose();
  }

  goLive(): void {
    this.clock.clearMock();
    this.beginClose();
  }

  // Update the draft and scrub the live clock to it so faces move as you drag.
  private scrubTo(date: Date): void {
    this.draft.set(toLocalInput(date));
    this.clock.setMock(date);
  }

  // Play the slide-out, then remove the sheet from the DOM once it finishes.
  // The clock side-effects are applied by the caller before this runs.
  private beginClose(): void {
    if (this.panelClosing()) return;
    this.panelClosing.set(true);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.panelClosing.set(false);
      this.panelOpen.set(false);
    }, CLOSE_MS);
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      // Keep the button on screen while the picker is open.
      if (!this.panelOpen()) this.visible.set(false);
    }, HIDE_DELAY_MS);
  }
}
