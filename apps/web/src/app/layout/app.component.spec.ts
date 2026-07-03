import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ScreensService } from '@core/screens/screens.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
  key: (i: number) => Object.keys(mem)[i] ?? null,
  get length() {
    return Object.keys(mem).length;
  },
};

describe('AppComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
  });

  it('renders one screen host for the single seeded screen', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-screen-host').length).toBe(1);
  });

  it('mounts a 3-window (active +/- 1) when there are many screens', () => {
    const screens = TestBed.inject(ScreensService);
    for (let i = 0; i < 4; i++) screens.addScreen(); // 5 screens, active index 4
    screens.setActiveIndex(2);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // indices 1,2,3 mounted
    expect(fixture.componentInstance.mountedScreens().map((m) => m.index)).toEqual([1, 2, 3]);
  });

  it('ArrowRight/ArrowLeft move the active index', () => {
    const screens = TestBed.inject(ScreensService);
    screens.addScreen(); // 2 screens; addScreen activated index 1
    screens.setActiveIndex(0);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(screens.activeIndex()).toBe(1);
    fixture.componentInstance.onKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(screens.activeIndex()).toBe(0);
  });

  it('selecting a face sets it on the active screen', () => {
    const screens = TestBed.inject(ScreensService);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    fixture.componentInstance.selectFace('world-cards');
    expect(screens.activeScreen().faceId).toBe('world-cards');
  });

  it('shows only the next chevron at the first of several screens', () => {
    const screens = TestBed.inject(ScreensService);
    screens.addScreen();
    screens.setActiveIndex(0);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chevron.next')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.chevron.prev')).toBeNull();
  });

  it('shows both chevrons in the middle', () => {
    const screens = TestBed.inject(ScreensService);
    screens.addScreen();
    screens.addScreen();
    screens.setActiveIndex(1);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.chevron.prev')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.chevron.next')).toBeTruthy();
  });

  it('renders face-picker previews using the active screen host injector (no NG0201)', () => {
    // After the first detectChanges() the ScreenHostComponent is mounted and
    // registers its element injector (which carries the scoped stores) with
    // ScreensService.  activeInjector() must forward to that registered injector
    // so the face previews can inject FullscreenConfigStore etc.  Using the
    // private SCREEN_ID-only injector instead causes NG0201.
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges(); // mounts screen hosts; hosts register their injectors

    fixture.componentInstance.openSheet();
    expect(() => fixture.detectChanges()).not.toThrow();

    // At least one face component rendered inside a preview viewport.
    expect(fixture.nativeElement.querySelector('.preview-viewport *')).toBeTruthy();
  });
});
