import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClockService } from './clock.service';

const MOCK_KEY = 'allyclock.clock.mock';
const TZ_KEY = 'allyclock.clock.tz';

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('ClockService', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // A fresh service reads localStorage at construction, simulating a reload.
  function freshService(): ClockService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(ClockService);
  }

  it('starts at the current time', () => {
    const service = TestBed.inject(ClockService);
    expect(service.now().toISOString()).toBe('2026-06-11T12:00:00.000Z');
  });

  it('ticks forward as time advances', () => {
    const service = TestBed.inject(ClockService);
    const start = service.now().getTime();
    vi.advanceTimersByTime(100);
    expect(service.now().getTime()).toBeGreaterThan(start);
  });

  it('freezes at the mocked instant when set', () => {
    const service = TestBed.inject(ClockService);
    const mock = new Date('2020-01-01T08:30:00.000Z');
    service.setMock(mock);
    expect(service.isMocked()).toBe(true);
    expect(service.now().toISOString()).toBe('2020-01-01T08:30:00.000Z');
    vi.advanceTimersByTime(5000);
    expect(service.now().toISOString()).toBe('2020-01-01T08:30:00.000Z');
  });

  it('returns to live time after clearMock', () => {
    const service = TestBed.inject(ClockService);
    service.setMock(new Date('2020-01-01T08:30:00.000Z'));
    service.clearMock();
    expect(service.isMocked()).toBe(false);
    expect(service.now().toISOString()).toBe('2026-06-11T12:00:00.000Z');
  });

  it('persists the mock to localStorage when set', () => {
    const service = TestBed.inject(ClockService);
    service.setMock(new Date('2020-01-01T08:30:00.000Z'));
    expect(localStorage.getItem(MOCK_KEY)).toBe('2020-01-01T08:30:00.000Z');
  });

  it('restores the persisted mock on a fresh service instance', () => {
    TestBed.inject(ClockService).setMock(new Date('2020-01-01T08:30:00.000Z'));

    const restored = freshService();
    expect(restored.isMocked()).toBe(true);
    expect(restored.now().toISOString()).toBe('2020-01-01T08:30:00.000Z');
  });

  it('removes the persisted mock when cleared, so a reload stays live', () => {
    const service = TestBed.inject(ClockService);
    service.setMock(new Date('2020-01-01T08:30:00.000Z'));
    service.clearMock();
    expect(localStorage.getItem(MOCK_KEY)).toBeNull();

    const restored = freshService();
    expect(restored.isMocked()).toBe(false);
    expect(restored.now().toISOString()).toBe('2026-06-11T12:00:00.000Z');
  });

  it('ignores an invalid stored value and starts live', () => {
    mockStorage[MOCK_KEY] = 'not-a-date';
    const restored = freshService();
    expect(restored.isMocked()).toBe(false);
  });

  it('uses the local zone when no zone is mocked', () => {
    const service = TestBed.inject(ClockService);
    expect(service.timeZone()).toBe(LOCAL_TZ);
  });

  it('returns the mocked zone once set', () => {
    const service = TestBed.inject(ClockService);
    service.setTimeZone('Asia/Seoul');
    expect(service.timeZone()).toBe('Asia/Seoul');
  });

  it('counts a mocked zone alone as mocked', () => {
    const service = TestBed.inject(ClockService);
    expect(service.isMocked()).toBe(false);
    service.setTimeZone('Asia/Seoul');
    expect(service.isMocked()).toBe(true);
  });

  it('persists the mocked zone and a fresh service restores it', () => {
    TestBed.inject(ClockService).setTimeZone('Europe/Paris');
    expect(localStorage.getItem(TZ_KEY)).toBe('Europe/Paris');

    const restored = freshService();
    expect(restored.timeZone()).toBe('Europe/Paris');
    expect(restored.isMocked()).toBe(true);
  });

  it('clears the mocked zone, so a reload follows local again', () => {
    const service = TestBed.inject(ClockService);
    service.setTimeZone('Europe/Paris');
    service.clearTimeZone();
    expect(localStorage.getItem(TZ_KEY)).toBeNull();
    expect(service.timeZone()).toBe(LOCAL_TZ);

    const restored = freshService();
    expect(restored.timeZone()).toBe(LOCAL_TZ);
    expect(restored.isMocked()).toBe(false);
  });

  it('ignores an invalid stored zone and follows local', () => {
    mockStorage[TZ_KEY] = 'Not/AZone';
    const restored = freshService();
    expect(restored.timeZone()).toBe(LOCAL_TZ);
    expect(restored.isMocked()).toBe(false);
  });
});
