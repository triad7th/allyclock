import { Injectable } from '@angular/core';
import * as moment from 'moment-timezone';

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  constructor() {}

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
      case 'US':
      case 'LA':
        return moment.tz(targetDate, 'America/Los_Angeles').format('Z');
      case 'UK':
        return moment.tz(targetDate, 'UTC').format('Z');
      case 'KR':
        return moment.tz(targetDate, 'Asia/Seoul').format('Z');
      default:
        return 'PT';
    }
  }
}
