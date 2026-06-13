import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FacePickerSheetComponent } from './face-picker-sheet.component';

describe('FacePickerSheetComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacePickerSheetComponent],
    }).compileComponents();
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

  it('emits select with the face id when an option is clicked', () => {
    const fixture = createSheet();
    let selected = '';
    fixture.componentInstance.faceSelect.subscribe((id: string) => {
      selected = id;
    });
    const options = fixture.nativeElement.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    expect(selected).toBe('world-cards');
  });

  it('emits close when the backdrop is clicked', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.faceClose.subscribe(() => {
      closed = true;
    });
    (fixture.nativeElement.querySelector('.backdrop') as HTMLElement).click();
    expect(closed).toBe(true);
  });

  it('emits close on Escape', () => {
    const fixture = createSheet();
    let closed = false;
    fixture.componentInstance.faceClose.subscribe(() => {
      closed = true;
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(true);
  });
});
