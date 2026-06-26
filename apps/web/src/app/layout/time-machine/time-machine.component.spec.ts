import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TimeMachineComponent } from './time-machine.component';
import { ClockService } from '@core/clock.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('TimeMachineComponent', () => {
  let clock: ClockService;
  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({ imports: [TimeMachineComponent] }).compileComponents();
    clock = TestBed.inject(ClockService);
  });

  it('interprets the datetime field in the selected zone (UTC, not local)', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00');
    expect(clock.now().toISOString()).toBe('2026-06-25T12:00:00.000Z'); // 12:00 UTC, not 12:00 local
  });

  it('move mode keeps the typed time and moves the instant on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC
    c.zoneChangeMode.set('move');
    c.onTimeZone('Asia/Seoul');
    // digits stay 12:00, now in Seoul → 03:00 UTC instant
    expect(clock.now().toISOString()).toBe('2026-06-25T03:00:00.000Z');
  });

  it('freeze mode keeps the instant and relabels on zone change', () => {
    const fixture = TestBed.createComponent(TimeMachineComponent);
    const c = fixture.componentInstance;
    clock.setTimeZone('UTC');
    c.onDateTime('2026-06-25T12:00'); // 12:00 UTC instant
    const before = clock.now().toISOString();
    c.zoneChangeMode.set('freeze');
    c.onTimeZone('Asia/Seoul');
    expect(clock.now().toISOString()).toBe(before); // instant unchanged
    expect(c.draft()).toBe('2026-06-25T21:00'); // 12:00 UTC = 21:00 Seoul
  });
});
