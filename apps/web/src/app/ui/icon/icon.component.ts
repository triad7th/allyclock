import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// SF Symbol name -> SVG path data. The `name` input mirrors Apple's SF Symbol
// names so native ports swap this component for `Image(systemName:)` directly.
// Paths are drawn on a 24x24 viewBox with round caps/joins.
const ICON_PATHS: Record<string, string> = {
  pencil: 'M14.5 4.5l3 3M4 17l9.5-9.5 3 3L7 20l-4 1 1-4z',
  photo: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5zM5 17l5-5 4 4 2.5-2.5L21 16',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0l-.7 12a2 2 0 0 1-2 1.9H7.7a2 2 0 0 1-2-1.9L5 7',
  'square.and.arrow.up': 'M12 15V4m0 0L8 8m4-4l4 4M5 13v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
};

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      @if (path()) {
        <path [attr.d]="path()" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1em;
      height: 1em;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly path = computed(() => ICON_PATHS[this.name()] ?? '');
}
