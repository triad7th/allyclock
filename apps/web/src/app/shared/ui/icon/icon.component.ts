import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// SF Symbol name -> SVG path data. The `name` input mirrors Apple's SF Symbol
// names so native ports swap this component for `Image(systemName:)` directly.
// Paths are drawn on a 24x24 viewBox with round caps/joins.
const ICON_PATHS = {
  pencil: 'M14.5 4.5l3 3M4 17l9.5-9.5 3 3L7 20l-4 1 1-4z',
  photo:
    'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5zM5 17l5-5 4 4 2.5-2.5L21 16',
  plus: 'M12 5v14M5 12h14',
  trash:
    'M4 7h16M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0l-.7 12a2 2 0 0 1-2 1.9H7.7a2 2 0 0 1-2-1.9L5 7',
  'square.and.arrow.up': 'M12 15V4m0 0L8 8m4-4l4 4M5 13v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4',
  'square.on.square':
    'M9 9h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM7 15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
  clock: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  'square.grid.2x2':
    'M5.5 4h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 4 8.5v-3A1.5 1.5 0 0 1 5.5 4zM15.5 4h3A1.5 1.5 0 0 1 20 5.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 14 8.5v-3A1.5 1.5 0 0 1 15.5 4zM5.5 14h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 4 18.5v-3A1.5 1.5 0 0 1 5.5 14zM15.5 14h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3a1.5 1.5 0 0 1-1.5-1.5v-3a1.5 1.5 0 0 1 1.5-1.5z',
  'arrow.clockwise': 'M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5',
  xmark: 'M6 6l12 12M18 6L6 18',
  'slider.horizontal.3':
    'M3.5 6.5h17M6 6.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0M3.5 12h17M13 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M3.5 17.5h17M8.5 17.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0',
  checkmark: 'M5 13l4 4L19 7',
  'arrow.right': 'M5 12h14M13 6l6 6-6 6',
  gearshape:
    'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
} as const;

export type SfSymbol = keyof typeof ICON_PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
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
  readonly name = input.required<SfSymbol>();
  readonly path = computed(() => ICON_PATHS[this.name()] ?? '');
}
