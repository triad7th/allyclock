import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { FaceConfigService } from './services/face-config.service';
import { FACE_TRANSITION_MS } from '@core/animation-timing';

const mockStorage: Record<string, string> = {};

const storageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
};

describe('AppComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [AppComponent],
    }).compileComponents();
  });

  afterEach(() => {
    storageMock.clear();
    vi.unstubAllGlobals();
  });

  it('renders the fullscreen face by default', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-fullscreen-face')).toBeTruthy();
    expect(el.querySelector('app-world-cards-face')).toBeNull();
  });

  it('shows the configure button and no sheet initially', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-configure-button')).toBeTruthy();
    expect(el.querySelector('app-face-picker-sheet')).toBeNull();
  });

  it('switches face via the picker and persists the choice', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button.configure') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('app-face-picker-sheet')).toBeTruthy();

    const options = el.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    // The sheet plays its slide-out before the face actually switches.
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(el.querySelector('app-world-cards-face')).toBeTruthy();
    expect(el.querySelector('app-face-picker-sheet')).toBeNull();
    expect(localStorage.getItem('allyclock.face')).toBe('world-cards');
    vi.useRealTimers();
  });

  it('crossfades the old and new face during a switch', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button.configure') as HTMLButtonElement).click();
    fixture.detectChanges();

    const options = el.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    // The sheet plays its slide-out before faceSelect fires and the crossfade begins.
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    // Mid-crossfade: both faces are stacked, exactly one layer is leaving.
    const layers = el.querySelectorAll('.face-layer');
    expect(layers.length).toBe(2);
    expect(el.querySelectorAll('.face-layer.leaving').length).toBe(1);
    expect(el.querySelector('app-fullscreen-face')).toBeTruthy();
    expect(el.querySelector('app-world-cards-face')).toBeTruthy();

    // After the transition completes, only the incoming face remains.
    vi.advanceTimersByTime(FACE_TRANSITION_MS);
    fixture.detectChanges();
    const settled = el.querySelectorAll('.face-layer');
    expect(settled.length).toBe(1);
    expect(settled[0].querySelector('app-world-cards-face')).toBeTruthy();
    expect(el.querySelector('app-fullscreen-face')).toBeNull();
    vi.useRealTimers();
  });

  it('hides the controls bar while a face config panel is open', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const bar = el.querySelector('.controls-bar') as HTMLElement;
    expect(bar.classList.contains('hidden')).toBe(false);

    TestBed.inject(FaceConfigService).open.set(true);
    fixture.detectChanges();
    expect(bar.classList.contains('hidden')).toBe(true);
  });

  it('restores the persisted face on startup', () => {
    localStorage.setItem('allyclock.face', 'world-cards');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-face')).toBeTruthy();
  });
});
