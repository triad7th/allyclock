import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * iOS nav bar: leading slot · centered title · trailing slot.
 *
 * Hosts project actions into the `navLeading` and `navTrailing` slots (typically
 * <app-icon-button> instances). Equal 1fr side columns keep the title centered
 * even when the trailing side is wider.
 */
@Component({
  selector: 'app-nav-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-header.component.html',
  styleUrl: './nav-header.component.scss',
})
export class NavHeaderComponent {
  /** Centered title text. */
  readonly title = input<string>('');
}
