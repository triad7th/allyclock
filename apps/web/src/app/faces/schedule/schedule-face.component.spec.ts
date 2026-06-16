import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleFaceComponent } from './schedule-face.component';
import { ScheduleStoreService } from './schedule-store.service';
import { FaceConfigService } from '../../services/face-config.service';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from './default-schedule';
import { DEFAULT_PRESET_ID } from './schedule-preset';

const mockStore = {
  loadState: () => ({
    presets: [
      { id: DEFAULT_PRESET_ID, name: 'Summer Break', segments: DEFAULT_SEGMENTS, hasImage: false },
    ],
    activePresetId: DEFAULT_PRESET_ID,
  }),
  loadPresetImage: () => Promise.resolve(null),
  savePresetImage: vi.fn(),
  removePresetImage: vi.fn(),
};

describe('ScheduleFaceComponent', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ScheduleFaceComponent],
      providers: [{ provide: ScheduleStoreService, useValue: mockStore }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders an img element', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
  });

  it('renders the red-box overlay', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.red-box')).toBeTruthy();
  });

  it('img src defaults to DEFAULT_IMAGE_SRC', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.src).toContain(DEFAULT_IMAGE_SRC);
  });

  it('gear button is visible on load', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    const gear = fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement;
    expect(gear.classList.contains('hidden')).toBe(false);
  });

  it('gear button hides after 4s', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    vi.advanceTimersByTime(4000);
    fixture.detectChanges();
    const gear = fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement;
    expect(gear.classList.contains('hidden')).toBe(true);
  });

  it('gear button opens config overlay', () => {
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-schedule-config')).toBeTruthy();
  });

  it('opening config hides the app controls bar via FaceConfigService', () => {
    const faceConfig = TestBed.inject(FaceConfigService);
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    expect(faceConfig.open()).toBe(false);
    (fixture.nativeElement.querySelector('button.gear') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(faceConfig.open()).toBe(true);
  });

  it('cancelling config unmounts it immediately and reveals the controls bar', () => {
    const faceConfig = TestBed.inject(FaceConfigService);
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.onGearClick();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-schedule-config')).toBeTruthy();
    fixture.componentInstance.onConfigCancelled();
    fixture.detectChanges();
    expect(faceConfig.open()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-schedule-config')).toBeNull();
  });

  it('saving config unmounts it immediately and reveals the controls bar', () => {
    const faceConfig = TestBed.inject(FaceConfigService);
    const fixture = TestBed.createComponent(ScheduleFaceComponent);
    fixture.detectChanges();
    fixture.componentInstance.onGearClick();
    fixture.detectChanges();
    fixture.componentInstance.onConfigSaved();
    fixture.detectChanges();
    expect(faceConfig.open()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-schedule-config')).toBeNull();
  });
});
