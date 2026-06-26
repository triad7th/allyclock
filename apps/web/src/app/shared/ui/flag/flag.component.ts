import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

// Country flag keyed to an ISO 3166-1 alpha-2 code — the semantic key, mirroring
// the SF-Symbol icon layer. On the Web the code renders a square SVG flag (the
// flag-icons assets are copied to `/flags` by angular.json); an Apple port renders
// the same code as a regional-indicator emoji or asset. A null/blank code (UTC,
// Etc/*, or an unknown zone) falls back to the neutral `globe` symbol.
@Component({
  selector: 'app-flag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (code(); as c) {
      <img
        class="flag-img"
        [src]="'flags/1x1/' + c + '.svg'"
        [alt]="alt()"
        loading="lazy"
        decoding="async"
      />
    } @else {
      <app-icon class="flag-globe" name="globe" />
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      overflow: hidden;
    }
    .flag-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .flag-globe {
      width: 100%;
      height: 100%;
      color: inherit;
    }
  `,
})
export class FlagComponent {
  // ISO 3166-1 alpha-2 (case-insensitive); '' or null renders the globe.
  readonly countryCode = input<string | null>(null);
  // Optional human name (country or zone) for the flag's alt text.
  readonly name = input<string>('');

  readonly code = computed(() => (this.countryCode() ?? '').trim().toLowerCase() || null);
  readonly alt = computed(() => {
    const label = this.name().trim();
    if (label) return `${label} flag`;
    const c = this.code();
    return c ? `${c.toUpperCase()} flag` : '';
  });
}
