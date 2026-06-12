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
});
