import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Component, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContainerSizeDirective } from './container-size.directive';

@Component({
  standalone: true,
  imports: [ContainerSizeDirective],
  template: '<div appContainerSize #size="containerSize"></div>',
})
class HostComponent {
  readonly size = viewChild.required(ContainerSizeDirective);
}

/** Captures the most recent ResizeObserver so a test can drive its callback. */
interface FakeObserver {
  callback: ResizeObserverCallback;
  observed: Element[];
  disconnected: boolean;
  trigger(): void;
}

describe('ContainerSizeDirective', () => {
  let originalResizeObserver: typeof globalThis.ResizeObserver | undefined;
  let observers: FakeObserver[];

  beforeEach(async () => {
    originalResizeObserver = globalThis.ResizeObserver;
    observers = [];
    globalThis.ResizeObserver = class FakeResizeObserver implements ResizeObserver {
      private readonly record: FakeObserver;
      constructor(callback: ResizeObserverCallback) {
        this.record = {
          callback,
          observed: [],
          disconnected: false,
          trigger: () => callback([], this),
        };
        observers.push(this.record);
      }
      observe(target: Element): void {
        this.record.observed.push(target);
      }
      unobserve(): void {}
      disconnect(): void {
        this.record.disconnected = true;
      }
    };

    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver as typeof globalThis.ResizeObserver;
  });

  function hostDiv(fixture: ComponentFixture<HostComponent>): HTMLElement {
    return fixture.nativeElement.querySelector('div') as HTMLElement;
  }

  function stubBox(el: HTMLElement, width: number, height: number): void {
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
  }

  it('defaults width and height to 0 before any measurement', () => {
    const fixture = TestBed.createComponent(HostComponent);
    const directive = fixture.componentInstance.size();
    expect(directive.width()).toBe(0);
    expect(directive.height()).toBe(0);
  });

  it('reflects clientWidth/clientHeight after the afterNextRender seed runs', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    stubBox(hostDiv(fixture), 240, 160);
    fixture.detectChanges();
    await fixture.whenStable();
    const directive = fixture.componentInstance.size();
    expect(directive.width()).toBe(240);
    expect(directive.height()).toBe(160);
  });

  it('re-reads the changed box when the ResizeObserver callback fires', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const el = hostDiv(fixture);
    stubBox(el, 240, 160);
    fixture.detectChanges();
    await fixture.whenStable();
    const directive = fixture.componentInstance.size();
    expect(directive.width()).toBe(240);

    // Element grows, then the observer notifies.
    stubBox(el, 480, 320);
    expect(observers.length).toBe(1);
    observers[0].trigger();
    expect(directive.width()).toBe(480);
    expect(directive.height()).toBe(320);
  });

  it('observes the host element', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(observers.length).toBe(1);
    expect(observers[0].observed).toContain(hostDiv(fixture));
  });

  it('disconnects the observer on destroy without throwing', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(observers[0].disconnected).toBe(false);
    expect(() => fixture.destroy()).not.toThrow();
    expect(observers[0].disconnected).toBe(true);
  });
});
