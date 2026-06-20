import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LocationService } from './location.service';

const summer = new Date('2026-06-11T12:00:00.000Z'); // PDT in Los Angeles
const winter = new Date('2026-01-15T12:00:00.000Z'); // PST in Los Angeles

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns the US offset with DST applied', () => {
    expect(service.getTimeZone('US', summer)).toBe('-07:00');
    expect(service.getTimeZone('US', winter)).toBe('-08:00');
  });

  it('returns UTC for UK', () => {
    expect(service.getTimeZone('UK', summer)).toBe('+00:00');
  });

  it('returns the Korea offset', () => {
    expect(service.getTimeZone('KR', summer)).toBe('+09:00');
  });

  it('falls back to the US offset for unknown ids', () => {
    expect(service.getTimeZone('XX', summer)).toBe('-07:00');
  });

  it('maps regions to flag URLs', () => {
    expect(service.getFlag('KR')).toContain('SOUTH_KOREA');
    expect(service.getFlag('UK')).toContain('GREAT_BRITAIN');
    expect(service.getFlag('US')).toContain('USA');
  });
});
