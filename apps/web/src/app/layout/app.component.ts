import {
  Component,
  computed,
  HostListener,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { FACES, FaceDescriptor } from '@features/faces/face-registry';
import { ScreenConfig, ScreensService } from '@core/screens/screens.service';
import { SCREEN_ID } from '@core/screens/screen-id';
import { ScreenHostComponent } from './screen-host/screen-host.component';
import { ConfigureButtonComponent } from './configure-button/configure-button.component';
import { AdjustButtonComponent } from './adjust-button/adjust-button.component';
import { FacePickerSheetComponent } from './face-picker-sheet/face-picker-sheet.component';
import { TimeMachineComponent } from './time-machine/time-machine.component';
import { FaceConfigService } from '@core/face-config.service';
import { FaceOverlayComponent } from './face-overlay/face-overlay.component';
import { snapIndex } from './screen-strip/swipe-snap';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { ScreenButtonComponent } from './screen-button/screen-button.component';
import { ScreenSheetComponent } from './screen-sheet/screen-sheet.component';

interface MountedScreen {
  screen: ScreenConfig;
  index: number;
  injector: Injector;
}

@Component({
  selector: 'app-root',
  imports: [
    NgComponentOutlet,
    ConfigureButtonComponent,
    AdjustButtonComponent,
    FacePickerSheetComponent,
    TimeMachineComponent,
    FaceOverlayComponent,
    IconComponent,
    AutoHideDirective,
    ScreenButtonComponent,
    ScreenSheetComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly screens = inject(ScreensService);
  protected readonly faceConfig = inject(FaceConfigService);
  private readonly rootInjector = inject(Injector);
  private readonly configureButton = viewChild.required(ConfigureButtonComponent);

  protected readonly ScreenHostComponent = ScreenHostComponent;

  readonly sheetOpen = signal(false);
  readonly screenSheetOpen = signal(false);

  // Horizontal drag distance in px (0 at rest). Set during a pointer swipe.
  readonly dragPx = signal(0);
  readonly animating = signal(false);

  readonly activeIndex = this.screens.activeIndex;
  readonly activeScreen = this.screens.activeScreen;
  readonly activeFace = computed<FaceDescriptor>(
    () => FACES.find((f) => f.id === this.activeScreen().faceId) ?? FACES[0],
  );

  readonly showPrev = computed(() => this.activeIndex() > 0);
  readonly showNext = computed(() => this.activeIndex() < this.screens.screens().length - 1);

  // Cache one outlet injector per screen id (carries SCREEN_ID for scoped stores).
  private readonly injectorCache = new Map<number, Injector>();
  private injectorFor(id: number): Injector {
    let inj = this.injectorCache.get(id);
    if (!inj) {
      inj = Injector.create({
        providers: [{ provide: SCREEN_ID, useValue: id }],
        parent: this.rootInjector,
      });
      this.injectorCache.set(id, inj);
    }
    return inj;
  }

  // Which screens to mount: all while the screen sheet is open (previews need
  // live injectors), otherwise a 3-window around the active index so off-screen
  // faces stop their timers.
  readonly mountedScreens = computed<MountedScreen[]>(() => {
    const list = this.screens.screens();
    const active = this.activeIndex();
    const all = this.screenSheetOpen();
    return list
      .map((screen, index) => ({ screen, index, injector: this.injectorFor(screen.id) }))
      .filter((m) => all || Math.abs(m.index - active) <= 1);
  });

  // Strip transform: each cell sits at its true index (left: index*100vw); the
  // strip shifts so the active screen is centered, plus the live drag offset.
  readonly stripTransform = computed(
    () => `translateX(calc(${-this.activeIndex()} * 100vw + ${this.dragPx()}px))`,
  );

  // Active screen's config injector, for the face picker previews.
  // Use the host injector registered by ScreenHostComponent (which provides the
  // scoped stores). Do NOT use the private injectorFor — that creates a minimal
  // SCREEN_ID-only injector that lacks the stores and causes NG0201.
  readonly activeInjector = computed(() => this.screens.injectorFor(this.activeScreen().id));

  openSheet(): void {
    this.sheetOpen.set(true);
  }
  closeSheet(): void {
    this.sheetOpen.set(false);
    this.configureButton().focusButton();
  }
  openAdjust(): void {
    this.faceConfig.adjustOpen.set(true);
    this.faceConfig.open.set(true);
  }

  openScreenSheet(): void {
    this.screenSheetOpen.set(true);
  }
  closeScreenSheet(): void {
    this.screenSheetOpen.set(false);
  }

  selectFace(id: string): void {
    this.screens.setFace(this.activeScreen().id, id);
    this.closeSheet();
  }

  // --- Navigation ---------------------------------------------------------
  goTo(index: number): void {
    this.animating.set(true);
    this.screens.setActiveIndex(index);
    this.dragPx.set(0);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.faceConfig.open() || this.sheetOpen() || this.screenSheetOpen()) return;
    if (event.key === 'ArrowRight') this.goTo(this.activeIndex() + 1);
    else if (event.key === 'ArrowLeft') this.goTo(this.activeIndex() - 1);
  }

  // --- Pointer swipe ------------------------------------------------------
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private lastX = 0;
  private lastT = 0;
  private velocity = 0;
  private capturing = false;

  onPointerDown(event: PointerEvent): void {
    if (this.faceConfig.open() || this.sheetOpen() || this.screenSheetOpen()) return;
    this.pointerId = event.pointerId;
    this.startX = this.lastX = event.clientX;
    this.startY = event.clientY;
    this.lastT = event.timeStamp;
    this.velocity = 0;
    this.capturing = false;
    this.animating.set(false);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    // Only capture once horizontal intent is clear (don't hijack vertical scroll).
    if (!this.capturing) {
      if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy)) return;
      this.capturing = true;
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
    const dt = event.timeStamp - this.lastT || 1;
    this.velocity = (event.clientX - this.lastX) / dt;
    this.lastX = event.clientX;
    this.lastT = event.timeStamp;
    this.dragPx.set(dx);
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    if (!this.capturing) {
      this.dragPx.set(0);
      return;
    }
    this.capturing = false;
    const width = window.innerWidth || 1;
    const target = snapIndex(
      this.activeIndex(),
      this.dragPx(),
      this.velocity,
      width,
      this.screens.screens().length,
    );
    this.goTo(target);
  }
}
