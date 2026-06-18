export type DeviceCategory =
  | 'phone' | 'tablet' | 'laptop' | 'desktop' | 'tv' | 'console' | 'handheld' | 'display';

export interface DeviceRatio {
  name: string;
  ratio: number; // width / height (landscape orientation unless name says portrait)
  category: DeviceCategory;
}

const r = (w: number, h: number) => w / h;

export const DEVICE_RATIOS: DeviceRatio[] = [
  { name: 'Samsung mini display 840×400', ratio: r(840, 400), category: 'display' },
  { name: 'Desktop / TV 1080p (16:9)', ratio: r(1920, 1080), category: 'tv' },
  { name: 'Ultrawide monitor (21:9)', ratio: r(21, 9), category: 'desktop' },
  { name: 'MacBook / laptop (16:10)', ratio: r(16, 10), category: 'laptop' },
  { name: 'Steam Deck', ratio: r(1280, 800), category: 'handheld' },
  { name: 'Nintendo Switch (docked)', ratio: r(1280, 720), category: 'console' },
  { name: 'PS5 (TV 16:9)', ratio: r(1920, 1080), category: 'console' },
  { name: 'iPad Pro 11" landscape', ratio: r(1668, 1194), category: 'tablet' },
  { name: 'iPad Pro 11" portrait', ratio: r(1194, 1668), category: 'tablet' },
  { name: 'Surface Pro 7 (3:2)', ratio: r(3, 2), category: 'tablet' },
  { name: 'Google Nest Hub', ratio: r(1024, 600), category: 'display' },
  { name: 'Amazon Echo Show 8', ratio: r(1280, 800), category: 'display' },
  { name: 'iPhone 16 Pro Max portrait', ratio: r(1320, 2868), category: 'phone' },
  { name: 'iPhone 16 Pro Max landscape', ratio: r(2868, 1320), category: 'phone' },
  { name: 'iPhone SE portrait', ratio: r(750, 1334), category: 'phone' },
  { name: 'Samsung Galaxy S24 portrait', ratio: r(1080, 2340), category: 'phone' },
];

export function searchDevices(query: string): DeviceRatio[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEVICE_RATIOS;
  return DEVICE_RATIOS.filter((d) => d.name.toLowerCase().includes(q));
}
