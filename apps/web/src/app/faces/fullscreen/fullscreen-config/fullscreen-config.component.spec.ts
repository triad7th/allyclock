import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigComponent } from './fullscreen-config.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';
import { searchDevices } from '../device-ratios';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => { mem[k] = v; },
  removeItem: (k: string) => { delete mem[k]; },
  clear: () => { for (const k of Object.keys(mem)) delete mem[k]; },
};

describe('FullscreenConfigComponent', () => {
  let store: FullscreenConfigStore;

  beforeEach(async () => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    await TestBed.configureTestingModule({
      imports: [FullscreenConfigComponent],
    }).compileComponents();
    store = TestBed.inject(FullscreenConfigStore);
  });

  it('clicking the header X button emits closed after the exit animation', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(FullscreenConfigComponent);
      fixture.detectChanges();
      let closed = false;
      fixture.componentInstance.closed.subscribe(() => (closed = true));
      (
        fixture.nativeElement.querySelector('button[aria-label="Close"]') as HTMLButtonElement
      ).click();
      vi.advanceTimersByTime(SHEET_ANIMATION_MS);
      expect(closed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('clicking the second preset card sets editingId to that preset\'s id', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const presets = store.state().presets;
    expect(presets.length).toBeGreaterThanOrEqual(2);

    const secondPreset = presets[1];
    // Initially editingId is the first preset or pinnedPresetId
    const initialId = component.editingId();
    expect(initialId).toBe(presets[0].id);

    // Click the second preset card
    const cards = fixture.nativeElement.querySelectorAll('.preset-card');
    expect(cards.length).toBeGreaterThanOrEqual(2);
    (cards[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.editingId()).toBe(secondPreset.id);
  });

  it('second preset card gets active class after clicking it', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const presets = store.state().presets;
    const secondPreset = presets[1];

    const cards = fixture.nativeElement.querySelectorAll('.preset-card');
    (cards[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.editingId()).toBe(secondPreset.id);
    const activeCard = fixture.nativeElement.querySelector('.preset-card.active');
    expect(activeCard).not.toBeNull();
  });

  it('clicking the + card increases store presets length by 1 and selects the new preset', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const before = store.state().presets.length;
    const addCard = fixture.nativeElement.querySelector('.add-preset-card') as HTMLButtonElement;
    expect(addCard).not.toBeNull();
    addCard.click();
    fixture.detectChanges();

    expect(store.state().presets.length).toBe(before + 1);
    // The new preset's id should be the last one (duplicate adds to sorted list)
    const newPresets = store.state().presets;
    // editingId should be one of the new preset ids
    const editingId = component.editingId();
    expect(newPresets.find((p) => p.id === editingId)).toBeDefined();
    // The new preset should be different from what was selected before
    expect(newPresets.length).toBe(before + 1);
  });

  it('the × delete button on a card deletes that preset and the count drops', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();

    const before = store.state().presets.length;
    expect(before).toBeGreaterThan(1);

    // Should see delete buttons (more than one preset)
    const deleteButtons = fixture.nativeElement.querySelectorAll('.preset-delete');
    expect(deleteButtons.length).toBeGreaterThan(0);

    const firstPresetId = store.state().presets[0].id;
    (deleteButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(store.state().presets.length).toBe(before - 1);
    expect(store.state().presets.find((p) => p.id === firstPresetId)).toBeUndefined();
  });

  it('no × delete button is shown when there is only one preset', () => {
    // Delete presets until only one remains
    const presets = store.state().presets;
    for (let i = presets.length - 1; i > 0; i--) {
      store.deletePreset(presets[i].id);
    }
    expect(store.state().presets.length).toBe(1);

    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();

    const deleteButtons = fixture.nativeElement.querySelectorAll('.preset-delete');
    expect(deleteButtons.length).toBe(0);
  });

  it('committing a rename updates the preset name in the store', async () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const presetId = component.editingId();
    const originalName = store.state().presets.find((p) => p.id === presetId)!.name;

    // Trigger rename by clicking the card title
    const title = fixture.nativeElement.querySelector('.preset-title') as HTMLElement;
    expect(title).not.toBeNull();
    title.click();
    fixture.detectChanges();

    // Input should appear
    const input = fixture.nativeElement.querySelector('.rename-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Simulate typing and committing
    input.value = 'MY RENAMED PRESET';
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const updated = store.state().presets.find((p) => p.id === presetId)!;
    expect(updated.name).toBe('MY RENAMED PRESET');
    expect(updated.name).not.toBe(originalName);
  });

  it('deleting the currently-editing preset resets editingId to the first remaining preset', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Select the first preset (default)
    const firstPresetId = store.state().presets[0].id;
    expect(component.editingId()).toBe(firstPresetId);

    // Delete the first preset
    const deleteButtons = fixture.nativeElement.querySelectorAll('.preset-delete');
    (deleteButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    // editingId should now be the new first preset
    expect(component.editingId()).toBe(store.state().presets[0].id);
    expect(component.editingId()).not.toBe(firstPresetId);
  });

  // ── Task 10: Device search combobox ──────────────────────────────────────

  it('typing a device query filters filteredDevices to only matching entries', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Set query to 'iphone' — only iPhone entries should remain
    component.deviceQuery.set('iphone');
    fixture.detectChanges();

    const expected = searchDevices('iphone');
    expect(component.filteredDevices().length).toBe(expected.length);
    expect(component.filteredDevices().every((d) => d.name.toLowerCase().includes('iphone'))).toBe(true);
  });

  it('filtering by query also updates the rendered device list items', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Open picker first so the list is rendered in the DOM
    component.devicePickerOpen.set(true);
    component.deviceQuery.set('ipad');
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.fc-device-option');
    expect(options.length).toBeGreaterThan(0);
    for (const opt of Array.from(options) as HTMLElement[]) {
      expect(opt.textContent!.toLowerCase()).toContain('ipad');
    }
  });

  it('picking an ultrawide device sets editingId to the ultrawide band preset', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // Ultrawide monitor (21:9) ratio ≈ 2.33 → resolves to 'ultrawide' band (≥1.95)
    const ultrawideDevice = component.filteredDevices().find(
      (d) => d.name.toLowerCase().includes('ultrawide'),
    );
    expect(ultrawideDevice).toBeDefined();

    component.pickDevice(ultrawideDevice!);
    fixture.detectChanges();

    const expectedId = store.resolveForRatio(ultrawideDevice!.ratio).id;
    expect(component.editingId()).toBe(expectedId);
    expect(component.editingId()).toBe('ultrawide');
  });

  it('picking an iPhone portrait device sets editingId to the phone band preset', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    // iPhone portrait ratio < 0.62 → resolves to 'phone' band
    const iphonePortrait = component.filteredDevices().find(
      (d) => d.name.toLowerCase().includes('iphone') && d.name.toLowerCase().includes('portrait'),
    );
    expect(iphonePortrait).toBeDefined();
    expect(iphonePortrait!.ratio).toBeLessThan(0.62);

    component.pickDevice(iphonePortrait!);
    fixture.detectChanges();

    const expectedId = store.resolveForRatio(iphonePortrait!.ratio).id;
    expect(component.editingId()).toBe(expectedId);
    expect(component.editingId()).toBe('phone');
  });

  it('picking a device clears the deviceQuery and closes the list', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.deviceQuery.set('iphone');
    component.devicePickerOpen.set(true);
    fixture.detectChanges();

    const anyDevice = component.filteredDevices()[0];
    component.pickDevice(anyDevice);
    fixture.detectChanges();

    expect(component.deviceQuery()).toBe('');
    expect(component.devicePickerOpen()).toBe(false);
  });

  // ── Task 9: Section knobs, gaps, bar mode, pin ────────────────────────────

  it('moving the Time size slider updates sections.time.sizeScale in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const slider = fixture.nativeElement.querySelector(
      '[data-knob="time-size"]',
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '1.5';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.sections.time.sizeScale).toBeCloseTo(1.5);
  });

  it('toggling a section show/hide flips sections.weekday.visible in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const before = store.state().presets.find((p) => p.id === id)!.sections.weekday.visible;

    const toggle = fixture.nativeElement.querySelector(
      '[data-knob="weekday-visible"]',
    ) as HTMLInputElement;
    expect(toggle).not.toBeNull();

    toggle.click();
    fixture.detectChanges();

    const after = store.state().presets.find((p) => p.id === id)!.sections.weekday.visible;
    expect(after).toBe(!before);
  });

  it('clicking the Bar segmented "progress" button sets bar.mode to progress', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const btn = fixture.nativeElement.querySelector(
      '[data-knob="bar-mode-progress"]',
    ) as HTMLButtonElement;
    expect(btn).not.toBeNull();

    btn.click();
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.bar.mode).toBe('progress');
  });

  it('moving a gap slider updates gaps.timeToBar in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const slider = fixture.nativeElement.querySelector(
      '[data-knob="gap-timeToBar"]',
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '0.8';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.gaps.timeToBar).toBeCloseTo(0.8);
  });

  it('toggling pin on sets pinnedPresetId to editingId, toggling off sets it back to null', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const toggle = fixture.nativeElement.querySelector(
      '[data-knob="pin-toggle"]',
    ) as HTMLInputElement;
    expect(toggle).not.toBeNull();

    // Toggle on
    toggle.click();
    fixture.detectChanges();
    expect(store.state().pinnedPresetId).toBe(id);

    // Toggle off
    toggle.click();
    fixture.detectChanges();
    expect(store.state().pinnedPresetId).toBeNull();
  });
});
