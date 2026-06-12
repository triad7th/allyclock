import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenFaceComponent } from './fullscreen-face.component';

describe('FullscreenFaceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FullscreenFaceComponent],
    }).compileComponents();
  });

  it('renders the big time, precise line, and date line', () => {
    const fixture = TestBed.createComponent(FullscreenFaceComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.digits')?.textContent).toMatch(/\d{1,2}:\d{2}/);
    expect(el.querySelector('.precise')?.textContent).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{2}$/);
    expect(el.querySelector('.date-tz')?.textContent).toContain('GMT');
  });
});
