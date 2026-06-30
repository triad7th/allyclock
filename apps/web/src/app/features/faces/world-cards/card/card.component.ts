import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ClockService } from '@core/clock.service';
import { countryCodeForZone } from '@core/zone-country';
import { FlagComponent } from '@shared/ui/flag/flag.component';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { bigTime, precise, gmtOffset, compactOffset, zoneCity } from '../../fullscreen/clock-formatter';
import { type SectionMode, type CardSpan } from '../world-cards-config';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlagComponent, IconComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  host: { '[class.full]': "span() === 'full'" },
})
export class CardComponent {
  private readonly clock = inject(ClockService);
  private readonly locale = navigator.language || 'en-US';

  readonly zone = input.required<string>();
  readonly sectionMode = input.required<SectionMode>();
  readonly span = input.required<CardSpan>();

  readonly now = this.clock.now;
  readonly countryCode = computed(() => countryCodeForZone(this.zone()));
  readonly big = computed(() => bigTime(this.now(), this.locale, this.zone()));
  readonly precision = computed(
    () => `${precise(this.now(), this.zone())} ${gmtOffset(this.now(), this.zone())}`,
  );
  readonly city = computed(() => zoneCity(this.zone(), true));
  readonly offset = computed(() => compactOffset(this.now(), this.zone()));
  // DatePipe cannot take an IANA zone; Intl can. "Jun 28, 2026" (uppercased in CSS).
  readonly dateLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: this.zone(),
    }).format(this.now()),
  );
}
