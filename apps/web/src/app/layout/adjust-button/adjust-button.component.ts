import { Component, output } from '@angular/core';
import { AutoHideDirective, IconComponent } from '@allyworld/alloy-ui';

@Component({
  selector: 'app-adjust-button',
  imports: [AutoHideDirective, IconComponent],
  templateUrl: './adjust-button.component.html',
  styleUrl: './adjust-button.component.scss',
})
export class AdjustButtonComponent {
  readonly open = output<void>();
}
