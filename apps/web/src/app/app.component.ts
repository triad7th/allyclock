import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FACES } from './faces/face-registry';
import { FacePreferenceService } from './services/face-preference.service';
import { ConfigureButtonComponent } from './controls/configure-button/configure-button.component';
import { FacePickerSheetComponent } from './controls/face-picker-sheet/face-picker-sheet.component';
import { TimeMachineComponent } from './controls/time-machine/time-machine.component';

@Component({
  selector: 'app-root',
  imports: [
    NgComponentOutlet,
    ConfigureButtonComponent,
    FacePickerSheetComponent,
    TimeMachineComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly preference = inject(FacePreferenceService);
  private readonly configureButton = viewChild.required(ConfigureButtonComponent);

  readonly sheetOpen = signal(false);
  readonly activeFaceId = this.preference.activeFaceId;
  readonly activeFace = computed(
    () => FACES.find((face) => face.id === this.activeFaceId()) ?? FACES[0],
  );

  openSheet(): void {
    this.sheetOpen.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.configureButton().focusButton();
  }

  selectFace(id: string): void {
    this.preference.setFace(id);
    this.closeSheet();
  }
}
