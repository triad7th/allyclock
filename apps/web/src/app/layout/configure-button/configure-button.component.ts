import { Component, ElementRef, input, output, viewChild } from '@angular/core';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconComponent } from '@shared/ui/icon/icon.component';

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
