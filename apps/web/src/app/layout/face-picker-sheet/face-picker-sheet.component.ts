import { NgComponentOutlet } from '@angular/common';
import { Component, Injector, input, output, viewChild } from '@angular/core';
import { FACES } from '@features/faces/face-registry';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';

@Component({
  selector: 'app-face-picker-sheet',
  imports: [NgComponentOutlet, SheetComponent],
  templateUrl: './face-picker-sheet.component.html',
  styleUrl: './face-picker-sheet.component.scss',
})
export class FacePickerSheetComponent {
  readonly faces = FACES;
  readonly activeFaceId = input.required<string>();
  readonly previewInjector = input<Injector | undefined>(undefined);
  readonly faceSelect = output<string>();
  readonly faceClose = output<void>();

  private readonly sheet = viewChild.required(SheetComponent);
  private pendingSelectId: string | null = null;

  // Choose a face; remember it, then play the sheet's slide-out. The real
  // emit happens in onSheetClosed once <app-sheet> finishes its exit.
  selectFace(id: string): void {
    this.pendingSelectId = id;
    this.sheet().close();
  }

  // <app-sheet> finished its exit (via selectFace, backdrop, or Escape).
  // Emit the pending selection if one was made, otherwise a plain close.
  onSheetClosed(): void {
    if (this.pendingSelectId !== null) this.faceSelect.emit(this.pendingSelectId);
    else this.faceClose.emit();
  }
}
