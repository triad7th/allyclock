import { Component, computed, output, viewChild } from '@angular/core';
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

  private readonly _ah = viewChild(AutoHideDirective);

  /** Delegated to the directive; kept for spec compatibility. */
  readonly visible = computed(() => this._ah()?.visible() ?? true);

  /** Delegated to the directive; kept for spec compatibility. */
  reveal(): void {
    this._ah()?.reveal();
  }
}
