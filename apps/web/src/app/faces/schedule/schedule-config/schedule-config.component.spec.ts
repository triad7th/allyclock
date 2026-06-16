import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleConfigComponent } from './schedule-config.component';
import { ScheduleStoreService } from '../schedule-store.service';
import { DEFAULT_SEGMENTS } from '../default-schedule';
import { DEFAULT_PRESET_ID } from '../schedule-preset';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';

function makeState() {
  return {
    presets: [
      { id: DEFAULT_PRESET_ID, name: 'Summer Break', segments: DEFAULT_SEGMENTS, hasImage: false },
    ],
    activePresetId: DEFAULT_PRESET_ID,
  };
}

const mockStore = {
  state: makeState(),
  loadState: vi.fn(),
  addPreset: vi.fn(),
  duplicatePreset: vi.fn(() =>
    Promise.resolve({
      id: 'dup',
      name: 'Summer Break - 2',
      segments: DEFAULT_SEGMENTS,
      hasImage: true,
    }),
  ),
  renamePreset: vi.fn(),
  deletePreset: vi.fn(),
  setActive: vi.fn(),
  updateSegments: vi.fn(),
  loadPresetImage: vi.fn(() => Promise.resolve(null)),
  savePresetImage: vi.fn(() => Promise.resolve()),
  removePresetImage: vi.fn(() => Promise.resolve()),
};

describe('ScheduleConfigComponent', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore.state = makeState();
    // Mirror the real store: each load yields a fresh array (the real store
    // re-parses from localStorage), so signal updates trigger recomputation.
    mockStore.loadState.mockImplementation(() => ({
      presets: mockStore.state.presets.map((p) => ({ ...p })),
      activePresetId: mockStore.state.activePresetId,
    }));
    mockStore.addPreset.mockImplementation(() => {
      const p = { id: 'p2', name: 'Preset #2', segments: DEFAULT_SEGMENTS, hasImage: false };
      mockStore.state.presets.push(p);
      mockStore.state.activePresetId = 'p2';
      return p;
    });
    mockStore.duplicatePreset.mockImplementation(() => {
      const p = { id: 'dup', name: 'Summer Break - 2', segments: DEFAULT_SEGMENTS, hasImage: true };
      mockStore.state.presets.push(p);
      mockStore.state.activePresetId = 'dup';
      return Promise.resolve(p);
    });
    mockStore.setActive.mockImplementation((id: string) => {
      mockStore.state.activePresetId = id;
    });
    mockStore.deletePreset.mockImplementation((id: string) => {
      const i = mockStore.state.presets.findIndex((p) => p.id === id);
      if (i === -1 || mockStore.state.presets.length <= 1) return;
      mockStore.state.presets.splice(i, 1);
      if (mockStore.state.activePresetId === id) {
        mockStore.state.activePresetId = mockStore.state.presets[Math.max(0, i - 1)].id;
      }
    });
    await TestBed.configureTestingModule({
      imports: [ScheduleConfigComponent],
      providers: [{ provide: ScheduleStoreService, useValue: mockStore }],
    }).compileComponents();
  });

  it('renders the config panel', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.config-panel')).toBeTruthy();
  });

  it('renders a card per preset plus an add-preset card', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.preset-card')).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.add-preset-card')).toBeTruthy();
  });

  it('uses the active preset name as the editor section title', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-title')?.textContent).toContain(
      'Summer Break',
    );
  });

  it('addPreset card calls store.addPreset and switches the active preset', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    expect(mockStore.addPreset).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.editor-title')?.textContent).toContain(
      'Preset #2',
    );
  });

  it('renders a per-card delete button and clicking it deletes that preset when more than one exists', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    const deleteButtons = fixture.nativeElement.querySelectorAll('.preset-delete');
    expect(deleteButtons).toHaveLength(2);
    const firstId = mockStore.state.presets[0].id;
    (deleteButtons[0] as HTMLElement).click();
    fixture.detectChanges();
    expect(mockStore.deletePreset).toHaveBeenCalledWith(firstId);
  });

  it('renders no per-card delete button when only one preset exists', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.preset-delete')).toHaveLength(0);
  });

  it('emits cancelled when cancel() is called, after the sheet exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(ScheduleConfigComponent);
      fixture.detectChanges();
      let cancelled = false;
      fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
      fixture.componentInstance.cancel();
      // Routed through <app-sheet>: nothing emits until the exit animation ends.
      expect(cancelled).toBe(false);
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking the header cancel button emits cancelled after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(ScheduleConfigComponent);
      fixture.detectChanges();
      let cancelled = false;
      fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
      (
        fixture.nativeElement.querySelector('button[aria-label="Cancel"]') as HTMLButtonElement
      ).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(cancelled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking the header done button emits saved after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(ScheduleConfigComponent);
      fixture.detectChanges();
      let saved = false;
      fixture.componentInstance.saved.subscribe(() => (saved = true));
      (
        fixture.nativeElement.querySelector('button[aria-label="Done"]') as HTMLButtonElement
      ).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(saved).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('empty preset shows a drop zone and only rename + delete overlay icons', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.overlay-icons app-icon')).toHaveLength(2);
  });

  it('default preset shows the image stage and a duplicate button', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeNull();
    expect(fixture.nativeElement.querySelector('.marker-preview-container')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ov-btn[aria-label="Duplicate preset"]')).toBeTruthy();
  });

  it('clicking the duplicate button calls store.duplicatePreset', async () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.ov-btn[aria-label="Duplicate preset"]') as HTMLElement).click();
    await fixture.whenStable();
    expect(mockStore.duplicatePreset).toHaveBeenCalled();
  });

  it('clicking .editor-title enters rename mode and shows the rename input', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    const title = fixture.nativeElement.querySelector('.editor-title') as HTMLElement;
    expect(title).toBeTruthy();
    title.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.editor-title')).toBeNull();
    expect(fixture.nativeElement.querySelector('input.rename-input')).toBeTruthy();
  });

  it('overlay icon buttons carry title attributes matching their aria-labels', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    const renameBtn = fixture.nativeElement.querySelector(
      '.ov-btn[aria-label="Rename preset"]',
    ) as HTMLElement;
    expect(renameBtn).toBeTruthy();
    expect(renameBtn.getAttribute('title')).toBe('Rename preset');
    const deleteBtn = fixture.nativeElement.querySelector(
      '.ov-btn[aria-label="Delete preset"]',
    ) as HTMLElement;
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn.getAttribute('title')).toBe('Delete preset');
  });
});
