import { NgComponentOutlet } from '@angular/common';
import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { FACES } from '../../faces/face-registry';

@Component({
  selector: 'app-face-picker-sheet',
  imports: [NgComponentOutlet],
  templateUrl: './face-picker-sheet.component.html',
  styleUrl: './face-picker-sheet.component.scss',
  host: {
    '(document:keydown.escape)': 'close.emit()',
  },
})
export class FacePickerSheetComponent {
  readonly faces = FACES;
  readonly activeFaceId = input.required<string>();
  readonly select = output<string>();
  readonly close = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  constructor() {
    afterNextRender(() => this.panel().nativeElement.focus());
  }
}
