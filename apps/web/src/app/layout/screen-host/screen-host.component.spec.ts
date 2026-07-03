import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  ViewContainerRef,
} from '@angular/core';
import { ScreenHostComponent } from './screen-host.component';
import { SCREEN_ID } from '@core/screens/screen-id';
import { ScreensService } from '@core/screens/screens.service';
import { FullscreenConfigStore } from '@features/faces/fullscreen/fullscreen-config-store.service';

const mem: Record<string, string> = {};
const storageMock = {
  getItem: (k: string) => mem[k] ?? null,
  setItem: (k: string, v: string) => {
    mem[k] = v;
  },
  removeItem: (k: string) => {
    delete mem[k];
  },
  clear: () => {
    for (const k of Object.keys(mem)) delete mem[k];
  },
};

// Thin wrapper that exposes a ViewContainerRef so we can create ScreenHostComponent
// with a custom element injector supplying SCREEN_ID — simulating what the screen
// strip outlet does in the real app.
//
// Note: TestBed.createComponent(Cmp, { injector }) compiles in Angular 21 but the
// injector option is NOT honoured at runtime (the component resolves SCREEN_ID from
// DynamicTestModule and throws NG0201). ViewContainerRef.createComponent DOES honour
// the injector option, so we use this wrapper approach instead.
@Component({
  selector: 'test-host-wrapper',
  template: '',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class WrapperComponent {
  readonly vcr = inject(ViewContainerRef);
}

// Mount a host as if the strip created its outlet injector with SCREEN_ID = id.
function mountHost(id: number, faceId: string) {
  const wrapperFixture = TestBed.createComponent(WrapperComponent);
  const vcr = wrapperFixture.componentInstance.vcr;
  const parentInj = Injector.create({
    providers: [{ provide: SCREEN_ID, useValue: id }],
    parent: vcr.injector,
  });
  const ref = vcr.createComponent(ScreenHostComponent, { injector: parentInj });
  ref.setInput('screen', { id, faceId });
  wrapperFixture.detectChanges();
  return { wrapperFixture, ref };
}

describe('ScreenHostComponent', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.stubGlobal('localStorage', storageMock);
    TestBed.resetTestingModule();
  });

  it('registers its injector with ScreensService while mounted', () => {
    const screens = TestBed.inject(ScreensService);
    const { ref } = mountHost(3, 'fullscreen');
    const inj = screens.injectorFor(3);
    expect(inj).toBeTruthy();
    // The registered injector resolves the screen-scoped store.
    expect(inj!.get(FullscreenConfigStore)).toBeTruthy();
    ref.destroy();
    expect(screens.injectorFor(3)).toBeUndefined();
  });

  it('two hosts hold independent scoped stores writing to distinct keys', () => {
    const { ref: refA } = mountHost(1, 'fullscreen');
    const { ref: refB } = mountHost(2, 'fullscreen');
    const screens = TestBed.inject(ScreensService);
    const storeA = screens.injectorFor(1)!.get(FullscreenConfigStore);
    const storeB = screens.injectorFor(2)!.get(FullscreenConfigStore);
    expect(storeA).not.toBe(storeB);
    // FullscreenConfigStore seeds localStorage on construction, so both keys
    // already exist. The invariant is that a mutation to storeA does NOT touch
    // storeB's key — snapshot screen 2's value before the screen-1 write.
    const snap2 = mem['allyclock.screen.2.fullscreen.config'];
    storeA.setSecondsVisibleAll(false);
    expect(mem['allyclock.screen.1.fullscreen.config']).toBeDefined();
    // Screen 2's config key is untouched by the screen-1 mutation.
    expect(mem['allyclock.screen.2.fullscreen.config']).toBe(snap2);
    refA.destroy();
    refB.destroy();
  });

  it('renders one face layer for the screen face', () => {
    const { ref } = mountHost(1, 'fullscreen');
    expect(ref.location.nativeElement.querySelectorAll('.face-layer').length).toBe(1);
  });
});
