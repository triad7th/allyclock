import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ConfigureButtonComponent } from './configure-button.component';

describe('ConfigureButtonComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ConfigureButtonComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createButton() {
    const fixture = TestBed.createComponent(ConfigureButtonComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.configure') as HTMLButtonElement;
    return { fixture, button };
  }

  it('is visible on load', () => {
    const { button } = createButton();
    expect(button.classList.contains('hidden')).toBe(false);
  });

  it('hides after the idle delay', () => {
    const { fixture, button } = createButton();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(true);
  });

  it('reappears on pointer movement and re-arms the hide timer', () => {
    const { fixture, button } = createButton();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    document.dispatchEvent(new Event('pointermove'));
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(false);
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(true);
  });

  it('stays visible while pinned', () => {
    const { fixture, button } = createButton();
    fixture.componentRef.setInput('pinned', true);
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    expect(button.classList.contains('hidden')).toBe(false);
  });

  it('emits open when clicked', () => {
    const { fixture, button } = createButton();
    let opened = false;
    fixture.componentInstance.open.subscribe(() => {
      opened = true;
    });
    button.click();
    expect(opened).toBe(true);
  });
});
