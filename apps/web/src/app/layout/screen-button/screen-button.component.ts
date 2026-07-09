import { Component, input, output } from '@angular/core';
import { AutoHideDirective, IconComponent } from '@allyworld/alloy-ui';

@Component({
  selector: 'app-screen-button',
  imports: [AutoHideDirective, IconComponent],
  templateUrl: './screen-button.component.html',
  styleUrl: './screen-button.component.scss',
})
export class ScreenButtonComponent {
  readonly pinned = input(false);
  readonly open = output<void>();
}
