import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { AutoHideDirective, IconComponent } from '@allyworld/alloy-ui';

@Component({
  selector: 'app-configure-button',
  imports: [AutoHideDirective, IconComponent],
  templateUrl: './configure-button.component.html',
  styleUrl: './configure-button.component.scss',
})
export class ConfigureButtonComponent {
  readonly pinned = input(false);
  readonly open = output<void>();

  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');

  focusButton(): void {
    this.button().nativeElement.focus();
  }
}
