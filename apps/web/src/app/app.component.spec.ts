import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

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
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('button.configure') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('app-face-picker-sheet')).toBeTruthy();

    const options = el.querySelectorAll('button.face-option');
    (options[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('app-world-cards-face')).toBeTruthy();
    expect(el.querySelector('app-face-picker-sheet')).toBeNull();
    expect(localStorage.getItem('allyclock.face')).toBe('world-cards');
  });

  it('restores the persisted face on startup', () => {
    localStorage.setItem('allyclock.face', 'world-cards');
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-world-cards-face')).toBeTruthy();
  });
});
