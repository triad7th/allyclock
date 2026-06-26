import { Injectable } from '@angular/core';
import { zoneOffsetMinutes } from './zone-catalog';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  // Region id -> ISO 3166-1 alpha-2 country code, the semantic key the flag layer
  // renders (replaces the old CDN flag URLs). 'LA' (Los Angeles) flies the US flag.
  public getCountryCode(id: string): string {
    switch (id) {
      case 'UK':
        return 'gb';
      case 'KR':
        return 'kr';
      case 'US':
      case 'LA':
      default:
        return 'us';
    }
  }

  public getTimeZone(id: string, targetDate: Date): string {
    switch (id) {
      case 'UK':
        return offsetOf('UTC', targetDate);
      case 'KR':
        return offsetOf('Asia/Seoul', targetDate);
      case 'US':
      case 'LA':
      default:
        return offsetOf('America/Los_Angeles', targetDate);
    }
  }
}

function offsetOf(timeZone: string, date: Date): string {
  const min = zoneOffsetMinutes(timeZone, date);
  const pad = (n: number) => String(n).padStart(2, '0');
  const sign = min < 0 ? '-' : '+'; // ASCII minus — preserves existing output
  const abs = Math.abs(min);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}
