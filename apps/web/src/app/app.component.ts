import { Component, computed, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FACES, FaceDescriptor } from './faces/face-registry';
import { FacePreferenceService } from './services/face-preference.service';
import { ConfigureButtonComponent } from './controls/configure-button/configure-button.component';
import { AdjustButtonComponent } from './controls/adjust-button/adjust-button.component';
import { FacePickerSheetComponent } from './controls/face-picker-sheet/face-picker-sheet.component';
import { TimeMachineComponent } from './controls/time-machine/time-machine.component';
import { FaceConfigService } from './services/face-config.service';
import { FaceOverlayComponent } from './controls/face-overlay/face-overlay.component';
import { FACE_TRANSITION_MS } from './config/animation-timing';

// One stacked face during a crossfade. The leaving face fades out while the
// incoming face fades in; NgComponentOutlet renders one component per layer.
interface FaceLayer {
  key: number;
  face: FaceDescriptor;
  leaving: boolean;
}

@Component({
  selector: 'app-root',
  imports: [
    NgComponentOutlet,
    ConfigureButtonComponent,
    AdjustButtonComponent,
    FacePickerSheetComponent,
    TimeMachineComponent,
    FaceOverlayComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly preference = inject(FacePreferenceService);
  protected readonly faceConfig = inject(FaceConfigService);
  private readonly configureButton = viewChild.required(ConfigureButtonComponent);

  readonly sheetOpen = signal(false);
  readonly activeFaceId = this.preference.activeFaceId;
  readonly activeFace = computed(
    () => FACES.find((face) => face.id === this.activeFaceId()) ?? FACES[0],
  );

  private nextKey = 1;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  // Apple port: this two-layer crossfade maps to a SwiftUI `.transition(.opacity)`
  // keyed by face id, animated with `withAnimation(.easeInOut(duration:))`.
  readonly layers = signal<FaceLayer[]>([
    { key: 0, face: this.activeFace(), leaving: false },
  ]);

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.transitionTimer));
  }

  openSheet(): void {
    this.sheetOpen.set(true);
  }

  // The Fullscreen "Adjust" (size) panel: mark it open and hide the controls bar.
  openAdjust(): void {
    this.faceConfig.adjustOpen.set(true);
    this.faceConfig.open.set(true);
  }

  closeSheet(): void {
    this.sheetOpen.set(false);
    this.configureButton().focusButton();
  }

  selectFace(id: string): void {
    const changed = id !== this.activeFaceId();
    this.preference.setFace(id);
    this.closeSheet();
    if (changed) {
      this.crossfadeTo(this.activeFace());
    }
  }

  private crossfadeTo(face: FaceDescriptor): void {
    const key = this.nextKey++;
    this.layers.update((ls) => [
      ...ls.map((l) => ({ ...l, leaving: true })),
      { key, face, leaving: false },
    ]);
    // Clearing the prior timer makes rapid switches converge on the latest face.
    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(
      () => this.layers.set([{ key, face, leaving: false }]),
      FACE_TRANSITION_MS,
    );
  }
}
