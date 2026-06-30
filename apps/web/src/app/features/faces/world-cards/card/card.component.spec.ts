import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CardComponent } from './card.component';
import { ClockService } from '@core/clock.service';

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
};

// 2026-06-17T16:41:00Z = 9:41 AM in Los Angeles (PDT, −7), 22:11 in Kolkata (+5:30).
const fixed = new Date('2026-06-17T16:41:00Z');

function make(zone: string) {
  const fixture = TestBed.createComponent(CardComponent);
  fixture.componentRef.setInput('zone', zone);
  fixture.detectChanges();
  return fixture;
}

describe('CardComponent', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.configureTestingModule({});
    TestBed.inject(ClockService).setMock(fixed);
  });

  it('always shows seconds in the main time', () => {
    const el = make('America/Los_Angeles').nativeElement as HTMLElement;
    expect(el.querySelector('.seconds')).toBeTruthy();
  });

  it('shows the abbreviated city and a globe + compact offset in the date row', () => {
    const el = make('America/Los_Angeles').nativeElement as HTMLElement;
    expect(el.querySelector('.date .city')?.textContent?.trim()).toBe('LA');
    expect(el.querySelector('.date .offset app-icon.globe')).toBeTruthy();
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('−7');
  });

  it('keeps the minutes for sub-hour offsets', () => {
    const el = make('Asia/Kolkata').nativeElement as HTMLElement;
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('+5:30');
  });

  it('derives the flag country from the zone', () => {
    const img = make('Asia/Seoul').nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('flags/1x1/kr.svg');
  });

  it('offset zones show no city; UTC shows UTC as city', () => {
    const elOffset = make('-08:00').nativeElement as HTMLElement;
    expect(elOffset.querySelector('.date .city')).toBeNull();
    expect(elOffset.querySelector('.date .offset')?.textContent?.trim()).toBe('−8');

    const elUtc = make('UTC').nativeElement as HTMLElement;
    expect(elUtc.querySelector('.date .city')?.textContent?.trim()).toBe('UTC');
  });
});
