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

  it('starts visible (no .hidden class) and auto-hides after the delay', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button.adjust') as HTMLButtonElement;
    expect(btn.classList.contains('hidden')).toBe(false);
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(btn.classList.contains('hidden')).toBe(true);
  });

  it('emits open when the button is clicked', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    let opened = false;
    fixture.componentInstance.open.subscribe(() => (opened = true));
    (fixture.nativeElement.querySelector('button.adjust') as HTMLButtonElement).click();
    expect(opened).toBe(true);
  });

  it('renders the slider icon inside the button', () => {
    const fixture = TestBed.createComponent(AdjustButtonComponent);
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('app-icon');
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('ng-reflect-name') ?? icon.getAttribute('name')).toContain('slider');
  });
});
