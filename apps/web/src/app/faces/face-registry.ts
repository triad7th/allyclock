import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';
import { ScheduleFaceComponent } from './schedule/schedule-face.component';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  { id: 'fullscreen', displayName: 'Fullscreen', component: FullscreenFaceComponent },
  { id: 'world-cards', displayName: 'World Cards', component: WorldCardsFaceComponent },
  { id: 'schedule', displayName: 'Daily Schedule', component: ScheduleFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
