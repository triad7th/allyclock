import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenFaceComponent } from './fullscreen-face.component';

describe('FullscreenFaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenFaceComponent],
    }).compileComponents();
  });

  it('renders the time digits', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.digits')?.textContent).toMatch(/\d{1,2}:\d{2}/);
  });

  it('renders the date line with weekday, month, and day parts', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // weekday, month, day, gmt spans are all present in the .date section
    expect(el.querySelector('.date .weekday')).toBeTruthy();
    expect(el.querySelector('.date .month')).toBeTruthy();
    expect(el.querySelector('.date .day')).toBeTruthy();
    expect(el.querySelector('.date .gmt')?.textContent).toContain('GMT');
  });

  it('selects the ULTRA preset for a 2.1 ratio host', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 840, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 400, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activePreset().name).toBe('ULTRA');
  });

  it('selects the PHONE preset for a tall portrait host', async () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.defineProperty(host, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(host, 'clientHeight', { value: 840, configurable: true });
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.activePreset().name).toBe('PHONE');
  });
});
