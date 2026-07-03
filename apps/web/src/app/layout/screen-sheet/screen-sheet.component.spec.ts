import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScreenSheetComponent } from './screen-sheet.component';
import { ScreensService } from '@core/screens/screens.service';
import { SCREEN_ID } from '@core/screens/screen-id';
import { FullscreenConfigStore } from '@features/faces/fullscreen/fullscreen-config-store.service';
import { WorldCardsConfigStore } from '@features/faces/world-cards/world-cards-config-store.service';
import { ScheduleStoreService } from '@features/faces/schedule/schedule-store.service';

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

describe('ScreenSheetComponent', () => {
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ScreenSheetComponent],
      providers: [
        { provide: SCREEN_ID, useValue: 1 },
        FullscreenConfigStore,
        WorldCardsConfigStore,
        ScheduleStoreService,
      ],
    }).compileComponents();
  });

  it('renders one tile per screen plus the add tile', () => {
    const screens = TestBed.inject(ScreensService);
    screens.addScreen();
    const fixture = TestBed.createComponent(ScreenSheetComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.screen-tile').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.add-tile')).toBeTruthy();
  });

  it('hides per-tile trash when only one screen exists', () => {
    const fixture = TestBed.createComponent(ScreenSheetComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.screen-tile .remove')).toBeNull();
  });

  it('disables the add tile at the cap', () => {
    const screens = TestBed.inject(ScreensService);
    while (screens.screens().length < screens.maxScreens()) screens.addScreen();
    const fixture = TestBed.createComponent(ScreenSheetComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('.add-tile') as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('tapping a tile activates that screen', () => {
    const screens = TestBed.inject(ScreensService);
    screens.addScreen();
    screens.setActiveIndex(0);
    const fixture = TestBed.createComponent(ScreenSheetComponent);
    fixture.detectChanges();
    const tiles = fixture.nativeElement.querySelectorAll('.screen-tile');
    (tiles[1] as HTMLButtonElement).click();
    expect(screens.activeIndex()).toBe(1);
  });
});
