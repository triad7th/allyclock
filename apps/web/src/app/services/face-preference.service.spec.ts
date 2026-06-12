import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FacePreferenceService } from './face-preference.service';
import { DEFAULT_FACE_ID } from '../faces/face-registry';

const mockStorage: { [key: string]: string } = {};

describe('FacePreferenceService', () => {
  beforeEach(() => {
    mockStorage['allyclock.face'] = undefined!;
    TestBed.configureTestingModule({});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      removeItem: (key: string) => { delete mockStorage[key]; },
      clear: () => {
        mockStorage['allyclock.face'] = undefined!;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to the fullscreen face', () => {
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe(DEFAULT_FACE_ID);
  });

  it('persists the selected face', () => {
    const service = TestBed.inject(FacePreferenceService);
    service.setFace('world-cards');
    expect(service.activeFaceId()).toBe('world-cards');
    expect(localStorage.getItem('allyclock.face')).toBe('world-cards');
  });

  it('restores a stored face id', () => {
    localStorage.setItem('allyclock.face', 'world-cards');
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe('world-cards');
  });

  it('falls back to the default for unknown stored ids', () => {
    localStorage.setItem('allyclock.face', 'flip-clock');
    const service = TestBed.inject(FacePreferenceService);
    expect(service.activeFaceId()).toBe(DEFAULT_FACE_ID);
  });

  it('keeps the selection in memory when localStorage throws', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded');
    };
    try {
      const service = TestBed.inject(FacePreferenceService);
      service.setFace('world-cards');
      expect(service.activeFaceId()).toBe('world-cards');
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
