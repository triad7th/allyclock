import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SheetComponent } from './sheet.component';
import { SHEET_ANIMATION_MS } from '@core/animation-timing';

describe('SheetComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [SheetComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSheet(
    inputs: { backdrop?: boolean; fullHeight?: boolean; sheetLabel?: string } = {},
  ) {
    const fixture = TestBed.createComponent(SheetComponent);
    if (inputs.backdrop !== undefined) fixture.componentRef.setInput('backdrop', inputs.backdrop);
    if (inputs.fullHeight !== undefined)
      fixture.componentRef.setInput('fullHeight', inputs.fullHeight);
    if (inputs.sheetLabel !== undefined)
      fixture.componentRef.setInput('sheetLabel', inputs.sheetLabel);
    fixture.detectChanges();
    return fixture;
  }

  it('opening renders the panel and the backdrop by default', () => {
    const fixture = createSheet();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.sheet-panel')).not.toBeNull();
    expect(host.querySelector('.sheet-backdrop')).not.toBeNull();
  });

  it('omits the backdrop when [backdrop]=false', () => {
    const fixture = createSheet({ backdrop: false });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.sheet-panel')).not.toBeNull();
    expect(host.querySelector('.sheet-backdrop')).toBeNull();
  });

  it('exposes the sheet label as the dialog aria-label', () => {
    const fixture = createSheet({ sheetLabel: 'Choose a clock face' });
    const panel = (fixture.nativeElement as HTMLElement).querySelector('.sheet-panel');
    expect(panel?.getAttribute('aria-label')).toBe('Choose a clock face');
  });

  it('adds the full-height class to the panel when [fullHeight]=true', () => {
    const fixture = createSheet({ fullHeight: true });
    const panel = (fixture.nativeElement as HTMLElement).querySelector('.sheet-panel');
    expect(panel?.classList.contains('full-height')).toBe(true);
  });

  it('close() emits (closed) only after SHEET_ANIMATION_MS', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => {
      closed = true;
    });

    fixture.componentInstance.close();
    fixture.detectChanges();
    expect(
      (fixture.nativeElement.querySelector('.sheet-overlay') as HTMLElement).classList.contains(
        'closing',
      ),
    ).toBe(true);
    expect(closed).toBe(false);

    vi.advanceTimersByTime(SHEET_ANIMATION_MS - 1);
    expect(closed).toBe(false);

    vi.advanceTimersByTime(1);
    expect(closed).toBe(true);
  });

  it('emits (closed) once even when close() is called repeatedly', () => {
    const fixture = createSheet();
    let count = 0;
    fixture.componentInstance.closed.subscribe(() => {
      count += 1;
    });

    fixture.componentInstance.close();
    fixture.componentInstance.close();
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    expect(count).toBe(1);
  });

  it('closes when the backdrop is clicked', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => {
      closed = true;
    });

    (fixture.nativeElement.querySelector('.sheet-backdrop') as HTMLElement).click();
    expect(closed).toBe(false);
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    expect(closed).toBe(true);
  });

  it('closes on Escape', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.closed.subscribe(() => {
      closed = true;
    });

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(SHEET_ANIMATION_MS);
    expect(closed).toBe(true);
  });
});
