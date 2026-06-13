import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ClockService } from './clock.service';

describe('ClockService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T12:00:00.000Z'));
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
});
