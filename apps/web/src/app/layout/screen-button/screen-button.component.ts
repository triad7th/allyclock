import { Component, input, output } from '@angular/core';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconComponent } from '@shared/ui/icon/icon.component';

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
