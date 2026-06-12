import { Component, output } from '@angular/core';

@Component({
  selector: 'app-schedule-config',
  template: '<div class="schedule-config-placeholder"></div>',
})
export class ScheduleConfigComponent {
  readonly saved = output<void>();
  readonly cancelled = output<void>();
}
