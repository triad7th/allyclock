import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FullscreenConfigComponent } from './fullscreen-config.component';
import { FullscreenConfigStore } from '../fullscreen-config-store.service';
import { SHEET_ANIMATION_MS } from '../../../config/animation-timing';

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

  it('defaults editingId to the first preset', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.editingId()).toBe(store.state().presets[0].id);
  });

  it('clicking the second preset card sets editingId to that preset\'s id', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const presets = store.state().presets;
    expect(presets.length).toBeGreaterThanOrEqual(2);

    const secondPreset = presets[1];
    expect(component.editingId()).toBe(presets[0].id);

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

    const secondPreset = store.state().presets[1];

    const cards = fixture.nativeElement.querySelectorAll('.preset-card');
    (cards[1] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.editingId()).toBe(secondPreset.id);
    const activeCard = fixture.nativeElement.querySelector('.preset-card.active');
    expect(activeCard).not.toBeNull();
  });

  it('committing a rename updates the preset name in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    const presetId = component.editingId();
    const originalName = store.state().presets.find((p) => p.id === presetId)!.name;

    const title = fixture.nativeElement.querySelector('.preset-title') as HTMLElement;
    expect(title).not.toBeNull();
    title.click();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('.rename-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    input.value = 'MY RENAMED PRESET';
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    const updated = store.state().presets.find((p) => p.id === presetId)!;
    expect(updated.name).toBe('MY RENAMED PRESET');
    expect(updated.name).not.toBe(originalName);
  });

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

  it('moving the Date size slider sets sizeScale to the same value on all four date parts', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const slider = fixture.nativeElement.querySelector(
      '[data-knob="date-size"]',
    ) as HTMLInputElement;
    expect(slider).not.toBeNull();

    slider.value = '1.3';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const preset = store.state().presets.find((p) => p.id === id)!;
    expect(preset.sections.weekday.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.month.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.day.sizeScale).toBeCloseTo(1.3);
    expect(preset.sections.gmt.sizeScale).toBeCloseTo(1.3);
  });

  it('toggling Weekday flips sections.weekday.visible in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const before = store.state().presets.find((p) => p.id === id)!.sections.weekday.visible;

    const toggle = fixture.nativeElement.querySelector(
      '[data-knob="weekday-visible"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();

    toggle.click();
    fixture.detectChanges();

    const after = store.state().presets.find((p) => p.id === id)!.sections.weekday.visible;
    expect(after).toBe(!before);
  });

  it('toggling GMT flips sections.gmt.visible in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const before = store.state().presets.find((p) => p.id === id)!.sections.gmt.visible;

    const toggle = fixture.nativeElement.querySelector(
      '[data-knob="gmt-visible"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();

    toggle.click();
    fixture.detectChanges();

    const after = store.state().presets.find((p) => p.id === id)!.sections.gmt.visible;
    expect(after).toBe(!before);
  });

  it('toggling the Bar on/off flips bar.visible in the store', () => {
    const fixture = TestBed.createComponent(FullscreenConfigComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const id = component.editingId();

    const before = store.state().presets.find((p) => p.id === id)!.bar.visible;

    const toggle = fixture.nativeElement.querySelector(
      '[data-knob="bar-visible"]',
    ) as HTMLButtonElement;
    expect(toggle).not.toBeNull();

    toggle.click();
    fixture.detectChanges();

    const after = store.state().presets.find((p) => p.id === id)!.bar.visible;
    expect(after).toBe(!before);
  });
});
