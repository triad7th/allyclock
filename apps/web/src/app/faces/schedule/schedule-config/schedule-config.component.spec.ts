import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleConfigComponent } from './schedule-config.component';
import { ScheduleStoreService } from '../schedule-store.service';
import { DEFAULT_SEGMENTS } from '../default-schedule';

const mockStore = {
  loadSegments: vi.fn(() => DEFAULT_SEGMENTS),
  saveSegments: vi.fn(),
  loadImage: vi.fn(() => Promise.resolve(null)),
  saveImage: vi.fn(() => Promise.resolve()),
  removeImage: vi.fn(() => Promise.resolve()),
};

describe('ScheduleConfigComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [ScheduleConfigComponent],
      providers: [{ provide: ScheduleStoreService, useValue: mockStore }],
    }).compileComponents();
  });

  it('renders the config panel', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.config-panel')).toBeTruthy();
  });

  it('renders the image upload zone', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeTruthy();
  });

  it('emits cancelled when Cancel is clicked', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => { cancelled = true; });
    (fixture.nativeElement.querySelector('button.cancel') as HTMLButtonElement).click();
    expect(cancelled).toBe(true);
  });

  it('Save calls saveSegments and emits saved', async () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let saved = false;
    fixture.componentInstance.saved.subscribe(() => { saved = true; });
    await (fixture.nativeElement.querySelector('button.save') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(mockStore.saveSegments).toHaveBeenCalled();
    expect(saved).toBe(true);
  });

  it('Remove image calls store.removeImage', async () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    const removeBtn = fixture.nativeElement.querySelector('button.remove-image') as HTMLButtonElement;
    removeBtn.click();
    expect(mockStore.removeImage).toHaveBeenCalled();
  });
});
