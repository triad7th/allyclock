import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { FullscreenConfigComponent } from './fullscreen/fullscreen-config/fullscreen-config.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';
import { WorldCardsConfigComponent } from './world-cards/world-cards-config/world-cards-config.component';
import { ScheduleFaceComponent } from './schedule/schedule-face.component';

export { DEFAULT_FACE_ID } from '@core/screens/default-face-id';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
  // Present when the face has an "Adjust" (size) panel — gates the shell's
  // Adjust button. The face still renders its own panel internally; this is
  // declarative metadata, not a render hook.
  configComponent?: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  {
    id: 'fullscreen',
    displayName: 'Fullscreen',
    component: FullscreenFaceComponent,
    configComponent: FullscreenConfigComponent,
  },
  {
    id: 'world-cards',
    displayName: 'World Cards',
    component: WorldCardsFaceComponent,
    configComponent: WorldCardsConfigComponent,
  },
  { id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent },
];
