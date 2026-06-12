import { Type } from '@angular/core';
import { FullscreenFaceComponent } from './fullscreen/fullscreen-face.component';
import { WorldCardsFaceComponent } from './world-cards/world-cards-face.component';

export interface FaceDescriptor {
  id: string;
  displayName: string;
  component: Type<unknown>;
}

export const FACES: FaceDescriptor[] = [
  { id: 'fullscreen', displayName: 'Fullscreen', component: FullscreenFaceComponent },
  { id: 'world-cards', displayName: 'World Cards', component: WorldCardsFaceComponent },
];

export const DEFAULT_FACE_ID = 'fullscreen';
