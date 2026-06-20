import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IconComponent } from '@shared/ui/icon/icon.component';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-configure-button',
  imports: [IconComponent],
  templateUrl: './configure-button.component.html',
  styleUrl: './configure-button.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class ConfigureButtonComponent implements OnInit, OnDestroy {
  readonly pinned = input(false);
  readonly open = output<void>();
  readonly visible = signal(true);

  private readonly button = viewChild.required<ElementRef<HTMLButtonElement>>('button');
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.armHideTimer();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
  }

  reveal(): void {
    this.visible.set(true);
    this.armHideTimer();
  }

  focusButton(): void {
    this.button().nativeElement.focus();
  }

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.visible.set(false), HIDE_DELAY_MS);
  }
}
