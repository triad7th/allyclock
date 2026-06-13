import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FacePickerSheetComponent } from './face-picker-sheet.component';

describe('FacePickerSheetComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [FacePickerSheetComponent],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createSheet(activeFaceId = 'fullscreen') {
    const fixture = TestBed.createComponent(FacePickerSheetComponent);
    fixture.componentRef.setInput('activeFaceId', activeFaceId);
    fixture.detectChanges();
    return fixture;
  }

  it('renders one option per registered face', () => {
    const fixture = createSheet();
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    expect(options).toHaveLength(3);
  });

  it('highlights the active face', () => {
    const fixture = createSheet('world-cards');
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    expect(options[0].classList.contains('active')).toBe(false);
    expect(options[1].classList.contains('active')).toBe(true);
  });

  it('emits select with the face id after the slide-out finishes', () => {
    const fixture = createSheet();
    let selected = '';
    fixture.componentInstance.faceSelect.subscribe((id: string) => {
      selected = id;
    });
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    expect(selected).toBe('');
    vi.advanceTimersByTime(300);
    expect(selected).toBe('world-cards');
  });

  it('applies the closing class while sliding out', () => {
    const fixture = createSheet();
    (fixture.nativeElement.querySelector('.backdrop') as HTMLElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).classList.contains('closing')).toBe(true);
  });

  it('emits close after the slide-out finishes when the backdrop is clicked', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.faceClose.subscribe(() => {
      closed = true;
    });
    (fixture.nativeElement.querySelector('.backdrop') as HTMLElement).click();
    expect(closed).toBe(false);
    vi.advanceTimersByTime(300);
    expect(closed).toBe(true);
  });

  it('emits close after the slide-out finishes on Escape', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.faceClose.subscribe(() => {
      closed = true;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.advanceTimersByTime(300);
    expect(closed).toBe(true);
  });
});
