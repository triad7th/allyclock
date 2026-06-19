import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon.component';

const HIDE_DELAY_MS = 4000;

@Component({
  selector: 'app-adjust-button',
  imports: [IconComponent],
  templateUrl: './adjust-button.component.html',
  styleUrl: './adjust-button.component.scss',
  host: {
    '(document:pointermove)': 'reveal()',
    '(document:pointerdown)': 'reveal()',
    '(document:keydown)': 'reveal()',
  },
})
export class AdjustButtonComponent implements OnInit, OnDestroy {
  readonly open = output<void>();
  readonly visible = signal(true);

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

  private armHideTimer(): void {
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.visible.set(false), HIDE_DELAY_MS);
  }
}
