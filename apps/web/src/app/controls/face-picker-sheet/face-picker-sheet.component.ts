import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FACES } from '../../faces/face-registry';

// Matches the slide-down/fade-out animation duration in the sheet SCSS.
const CLOSE_MS = 280;

@Component({
  selector: 'app-face-picker-sheet',
  imports: [NgComponentOutlet],
  templateUrl: './face-picker-sheet.component.html',
  styleUrl: './face-picker-sheet.component.scss',
  host: {
    '[class.closing]': 'closing()',
    '(document:keydown.escape)': 'requestClose()',
  },
})
export class FacePickerSheetComponent implements OnDestroy {
  readonly faces = FACES;
  readonly activeFaceId = input.required<string>();
  readonly faceSelect = output<string>();
  readonly faceClose = output<void>();

  readonly closing = signal(false);

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingSelectId: string | null = null;

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }

  ngOnDestroy(): void {
    clearTimeout(this.closeTimer);
  }

  // Dismiss without choosing a face (backdrop click / Escape).
  requestClose(): void {
    this.beginClose(null);
  }

  // Choose a face; the sheet still slides out before the parent swaps faces.
  selectFace(id: string): void {
    this.beginClose(id);
  }

  // Play the slide-out, then emit the real close/select once it finishes.
  private beginClose(selectId: string | null): void {
    if (this.closing()) return;
    this.pendingSelectId = selectId;
    this.closing.set(true);
    clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (this.pendingSelectId !== null) this.faceSelect.emit(this.pendingSelectId);
      else this.faceClose.emit();
    }, CLOSE_MS);
  }
}
