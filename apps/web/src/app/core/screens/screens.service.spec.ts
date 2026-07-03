import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { ScreensService, MAX_SCREENS } from './screens.service';
import { DEFAULT_FACE_ID } from './default-face-id';

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

function make(): ScreensService {
  return TestBed.inject(ScreensService);
}

describe('ScreensService', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.resetTestingModule();
  });

  it('seeds one screen on the default face when nothing is stored', () => {
    const s = make();
    expect(s.screens().length).toBe(1);
    expect(s.screens()[0].faceId).toBe(DEFAULT_FACE_ID);
    expect(s.activeIndex()).toBe(0);
    expect(s.activeScreen().id).toBe(s.screens()[0].id);
  });

  it('migrates the legacy face + config keys into Screen 1', () => {
    mem['allyclock.face'] = 'world-cards';
    mem['allyclock.fullscreen.config'] = '{"v":1}';
    mem['allyclock.world-cards.config'] = '{"v":2}';
    mem['allyclock.schedule.presets'] = '{"presets":[]}';
    const s = make();
    expect(s.screens()[0].faceId).toBe('world-cards');
    expect(mem['allyclock.face']).toBeUndefined();
    expect(mem['allyclock.screen.1.fullscreen.config']).toBe('{"v":1}');
    expect(mem['allyclock.screen.1.world-cards.config']).toBe('{"v":2}');
    expect(mem['allyclock.screen.1.schedule.presets']).toBe('{"presets":[]}');
    expect(mem['allyclock.fullscreen.config']).toBeUndefined();
  });

  it('persists and re-reads its state round-trip', () => {
    make().addScreen();
    TestBed.resetTestingModule();
    const s2 = make();
    expect(s2.screens().length).toBe(2);
  });

  it('addScreen appends a default-face screen with a new id and activates it', () => {
    const s = make();
    const firstId = s.screens()[0].id;
    s.addScreen();
    expect(s.screens().length).toBe(2);
    expect(s.screens()[1].id).toBe(firstId + 1);
    expect(s.screens()[1].faceId).toBe(DEFAULT_FACE_ID);
    expect(s.activeIndex()).toBe(1);
  });

  it('addScreen is a no-op at the cap', () => {
    const s = make();
    for (let i = 0; i < MAX_SCREENS + 3; i++) s.addScreen();
    expect(s.screens().length).toBe(MAX_SCREENS);
  });

  it('removeScreen refuses to drop the last screen', () => {
    const s = make();
    s.removeScreen(s.screens()[0].id);
    expect(s.screens().length).toBe(1);
  });

  it('removeScreen clamps activeIndex and clears the screen storage', () => {
    const s = make();
    s.addScreen(); // screen 2, active index 1
    const secondId = s.screens()[1].id;
    mem[`allyclock.screen.${secondId}.fullscreen.config`] = '{}';
    s.removeScreen(secondId);
    expect(s.screens().length).toBe(1);
    expect(s.activeIndex()).toBe(0);
    expect(mem[`allyclock.screen.${secondId}.fullscreen.config`]).toBeUndefined();
  });

  it('setActiveIndex clamps to range', () => {
    const s = make();
    s.addScreen();
    s.setActiveIndex(99);
    expect(s.activeIndex()).toBe(1);
    s.setActiveIndex(-5);
    expect(s.activeIndex()).toBe(0);
  });

  it('setFace updates the target screen only', () => {
    const s = make();
    s.addScreen();
    const [a, b] = s.screens();
    s.setFace(a.id, 'schedule');
    expect(s.screens()[0].faceId).toBe('schedule');
    expect(s.screens()[1].faceId).toBe(b.faceId);
  });

  it('the injector registry stores and returns per-id injectors', () => {
    const s = make();
    const inj = Injector.create({ providers: [] });
    s.registerInjector(7, inj);
    expect(s.injectorFor(7)).toBe(inj);
    s.unregisterInjector(7);
    expect(s.injectorFor(7)).toBeUndefined();
  });
});
