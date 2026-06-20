import { Component, output } from '@angular/core';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconComponent } from '@shared/ui/icon/icon.component';

@Component({
  selector: 'app-adjust-button',
  imports: [AutoHideDirective, IconComponent],
  templateUrl: './adjust-button.component.html',
  styleUrl: './adjust-button.component.scss',
})
export class AdjustButtonComponent {
  readonly open = output<void>();
}
