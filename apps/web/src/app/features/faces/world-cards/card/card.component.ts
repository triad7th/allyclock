import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocationService } from '@core/location.service';
import { ClockService } from '@core/clock.service';
import { FlagComponent } from '@shared/ui/flag/flag.component';

@Component({
  selector: 'app-card',
  imports: [DatePipe, FlagComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent {
  private readonly location = inject(LocationService);
  private readonly clock = inject(ClockService);

  readonly state = input<string>('UK');
  readonly now = this.clock.now;
  readonly timeZone = computed(() => this.location.getTimeZone(this.state(), this.now()));
  readonly countryCode = computed(() => this.location.getCountryCode(this.state()));
}
