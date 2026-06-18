import { describe, it, expect } from 'vitest';
import { DEVICE_RATIOS, searchDevices } from './device-ratios';

describe('device ratios', () => {
  it('stores ratio = width / height', () => {
    const tv = DEVICE_RATIOS.find((d) => d.name.includes('1080p'));
    expect(tv && Math.abs(tv.ratio - 16 / 9) < 0.01).toBe(true);
  });

  it('searchDevices is case-insensitive substring match', () => {
    const r = searchDevices('iphone 16');
    expect(r.some((d) => d.name.toLowerCase().includes('iphone 16'))).toBe(true);
    expect(searchDevices('')).toEqual(DEVICE_RATIOS);
  });
});
