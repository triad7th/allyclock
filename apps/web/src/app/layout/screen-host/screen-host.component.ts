import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FACES, FaceDescriptor } from '@features/faces/face-registry';
import { ScreenConfig, ScreensService } from '@core/screens/screens.service';
import { SCREEN_ID } from '@core/screens/screen-id';
import { FullscreenConfigStore } from '@features/faces/fullscreen/fullscreen-config-store.service';
import { WorldCardsConfigStore } from '@features/faces/world-cards/world-cards-config-store.service';
import { ScheduleStoreService } from '@features/faces/schedule/schedule-store.service';
import { FACE_TRANSITION_MS } from '@core/animation-timing';

// One stacked face during a crossfade (moved here from AppComponent — face
// switches now happen inside a screen).
interface FaceLayer {
  key: number;
  face: FaceDescriptor;
  leaving: boolean;
}

function faceFor(id: string): FaceDescriptor {
  return FACES.find((f) => f.id === id) ?? FACES[0];
}

@Component({
  selector: 'app-screen-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgComponentOutlet],
  // Screen-scoped config stores: each host is its own DI scope, so a screen's
  // face + config panels resolve THIS screen's store instances. SCREEN_ID comes
  // from the outlet injector the strip supplies (a component's providers cannot
  // read an @Input, so the id is injected from above).
  providers: [FullscreenConfigStore, WorldCardsConfigStore, ScheduleStoreService],
  templateUrl: './screen-host.component.html',
  styleUrl: './screen-host.component.scss',
})
export class ScreenHostComponent {
  readonly screen = input.required<ScreenConfig>();

  private readonly screens = inject(ScreensService);
  private readonly id = inject(SCREEN_ID);
  private nextKey = 1;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  // Starts empty; the effect below initialises it on the first reactive read of
  // screen().faceId (which happens during the first detectChanges() after setInput).
  // We cannot read screen() here directly because required signal inputs throw
  // until Angular processes the first binding.
  readonly layers = signal<FaceLayer[]>([]);

  constructor() {
    // Expose this host's injector so sheets can render this screen's preview in
    // its own config context.
    this.screens.registerInjector(this.id, inject(Injector));
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      clearTimeout(this.transitionTimer);
      this.screens.unregisterInjector(this.id);
    });

    // Initialise layers on first reactive read, then crossfade on subsequent
    // faceId changes. The `initialised` flag avoids treating the first emission
    // as a crossfade (we want a hard-set, not a fade-in-from-nothing).
    let initialised = false;
    effect(() => {
      const faceId = this.screen().faceId;
      if (!initialised) {
        initialised = true;
        this.layers.set([{ key: 0, face: faceFor(faceId), leaving: false }]);
      } else {
        this.crossfadeTo(faceFor(faceId));
      }
    });
  }

  private crossfadeTo(face: FaceDescriptor): void {
    const key = this.nextKey++;
    this.layers.update((ls) => [
      ...ls.map((l) => ({ ...l, leaving: true })),
      { key, face, leaving: false },
    ]);
    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(
      () => this.layers.set([{ key, face, leaving: false }]),
      FACE_TRANSITION_MS,
    );
  }
}
