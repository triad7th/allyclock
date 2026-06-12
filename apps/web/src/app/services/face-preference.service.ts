import { Injectable, signal } from '@angular/core';
import { DEFAULT_FACE_ID, FACES } from '../faces/face-registry';

const STORAGE_KEY = 'allyclock.face';

@Injectable({
  providedIn: 'root',
})
export class FacePreferenceService {
  private readonly faceId = signal(restoreFaceId());
  readonly activeFaceId = this.faceId.asReadonly();

  setFace(id: string): void {
    this.faceId.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // localStorage unavailable (e.g. private browsing): keep the in-memory value
    }
  }
}

function restoreFaceId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && FACES.some((face) => face.id === stored)) {
      return stored;
    }
  } catch {
    // localStorage unavailable: fall through to the default
  }
  return DEFAULT_FACE_ID;
}
