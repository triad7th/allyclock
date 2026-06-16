import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ScheduleConfigComponent } from './schedule-config.component';
import { ScheduleStoreService } from '../schedule-store.service';
import { DEFAULT_SEGMENTS } from '../default-schedule';
import { DEFAULT_PRESET_ID } from '../schedule-preset';

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
    mockStore.loadState.mockImplementation(() => mockStore.state);
    mockStore.addPreset.mockImplementation(() => {
      const p = { id: 'p2', name: 'Preset #2', segments: DEFAULT_SEGMENTS, hasImage: false };
      mockStore.state.presets.push(p);
      mockStore.state.activePresetId = 'p2';
      return p;
    });
    mockStore.setActive.mockImplementation((id: string) => {
      mockStore.state.activePresetId = id;
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

  it('emits cancelled when cancel() is called', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    let cancelled = false;
    fixture.componentInstance.cancelled.subscribe(() => (cancelled = true));
    fixture.componentInstance.cancel();
    expect(cancelled).toBe(true);
  });

  it('empty preset shows a drop zone and only rename + delete overlay icons', () => {
    const fixture = TestBed.createComponent(ScheduleConfigComponent);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-preset-card') as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drop-zone')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('.overlay-icons app-icon')).toHaveLength(2);
  });
});
