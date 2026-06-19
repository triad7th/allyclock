import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AdjustButtonComponent } from './adjust-button.component';

describe('AdjustButtonComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AdjustButtonComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts visible and auto-hides after the delay', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.visible()).toBe(true);
    vi.advanceTimersByTime(4000);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('reveal() re-shows and re-arms the hide timer', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    vi.advanceTimersByTime(4000);
    expect(fixture.componentInstance.visible()).toBe(false);

    fixture.componentInstance.reveal();
    expect(fixture.componentInstance.visible()).toBe(true);
    vi.advanceTimersByTime(3999);
    expect(fixture.componentInstance.visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(fixture.componentInstance.visible()).toBe(false);
  });

  it('emits open when the button is clicked', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    let opened = false;
    fixture.componentInstance.open.subscribe(() => (opened = true));
    (fixture.nativeElement.querySelector('button.adjust') as HTMLButtonElement).click();
    expect(opened).toBe(true);
  });
});
