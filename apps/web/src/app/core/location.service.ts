import { Injectable } from '@angular/core';
import { zoneOffsetMinutes } from './zone-catalog';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  public getFlag(id: string): string {
    switch (id) {
      case 'US':
      case 'LA':
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/USA-128.png';
      case 'UK':
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/GREAT_BRITAIN-128.png';
      case 'KR':
        return 'https://cdn1.iconfinder.com/data/icons/rounded-square-national-flags/512/SOUTH_KOREA-128.png';
      default:
        return 'https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/USA-128.png';
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
