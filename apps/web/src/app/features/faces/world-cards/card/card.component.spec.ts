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

function make(zone: string, sectionMode: 'three' | 'two', span: 'full' | 'cell') {
  const fixture = TestBed.createComponent(CardComponent);
  fixture.componentRef.setInput('zone', zone);
  fixture.componentRef.setInput('sectionMode', sectionMode);
  fixture.componentRef.setInput('span', span);
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

  it('renders the precision row in 3-section and omits it in 2-section', () => {
    expect(make('America/Los_Angeles', 'three', 'cell').nativeElement.querySelector('.precision')).toBeTruthy();
    expect(make('America/Los_Angeles', 'two', 'cell').nativeElement.querySelector('.precision')).toBeNull();
  });

  it('shows seconds in the main only in 2-section', () => {
    expect(make('America/Los_Angeles', 'three', 'cell').nativeElement.querySelector('.seconds')).toBeNull();
    expect(make('America/Los_Angeles', 'two', 'cell').nativeElement.querySelector('.seconds')).toBeTruthy();
  });

  it('shows the abbreviated city and a globe + compact offset in the date row', () => {
    const el = make('America/Los_Angeles', 'three', 'cell').nativeElement as HTMLElement;
    expect(el.querySelector('.date .city')?.textContent?.trim()).toBe('LA');
    expect(el.querySelector('.date .offset app-icon.globe')).toBeTruthy();
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('−7');
  });

  it('keeps the minutes for sub-hour offsets', () => {
    const el = make('Asia/Kolkata', 'three', 'cell').nativeElement as HTMLElement;
    expect(el.querySelector('.date .offset')?.textContent?.trim()).toBe('+5:30');
  });

  it('derives the flag country from the zone', () => {
    const img = make('Asia/Seoul', 'three', 'cell').nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('flags/1x1/kr.svg');
  });

  it('adds the full host class only for full-row cards', () => {
    expect((make('Asia/Seoul', 'three', 'full').nativeElement as HTMLElement).classList.contains('full')).toBe(true);
    expect((make('Asia/Seoul', 'three', 'cell').nativeElement as HTMLElement).classList.contains('full')).toBe(false);
  });
});
