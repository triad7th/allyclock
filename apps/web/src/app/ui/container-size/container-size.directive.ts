import {
  DestroyRef,
  Directive,
  ElementRef,
  Signal,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

/**
 * Reports the live layout-box size of the element it is placed on, exposed as
 * the readonly `width` / `height` signals. Apply it as a host directive or as a
 * plain attribute directive on any element (including a projected `<img>`) and
 * read it through `exportAs` in a template:
 *
 * ```html
 * <div appContainerSize #size="containerSize">{{ size.width() }}x{{ size.height() }}</div>
 * ```
 *
 * Why `clientWidth`/`clientHeight` and not `window.innerWidth`/`innerHeight`:
 * the measurement reads the element's own layout box, which is unaffected by
 * any ancestor CSS `transform`. That is exactly what the clock faces need — a
 * face must size correctly both full-screen AND inside the scaled face-picker
 * preview (where an ancestor `transform: scale(...)` shrinks the pixels on
 * screen but leaves the layout box unchanged). Sizing to the window would make
 * the preview render at full-screen dimensions and overflow its thumbnail.
 *
 * Apple-port mapping: this is the Web equivalent of SwiftUI's `GeometryReader`
 * (or `.onGeometryChange(for: CGSize.self) { $0.size }` on iOS 16+). The native
 * port replaces this directive with a `GeometryReader`/`.onGeometryChange`
 * around the same subtree and binds the reported `CGSize.width`/`.height` to the
 * same state the `width`/`height` signals feed here.
 */
@Directive({
  selector: '[appContainerSize]',
  exportAs: 'containerSize',
})
export class ContainerSizeDirective {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly _width = signal(0);
  private readonly _height = signal(0);

  /** Layout-box width of the host element in CSS pixels. Defaults to 0. */
  readonly width: Signal<number> = this._width.asReadonly();
  /** Layout-box height of the host element in CSS pixels. Defaults to 0. */
  readonly height: Signal<number> = this._height.asReadonly();

  constructor() {
    // Seed the size once the element is laid out, so the first frame is correct
    // even before any ResizeObserver callback fires. In jsdom, where
    // ResizeObserver may be absent, this is the only measurement path.
    afterNextRender(() => this.measure());

    const element = this.el.nativeElement;
    // Guard for environments without ResizeObserver (e.g. tests/jsdom).
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.measure());
      observer.observe(element);
      inject(DestroyRef).onDestroy(() => observer.disconnect());
    }
  }

  private measure(): void {
    const element = this.el.nativeElement;
    this._width.set(element.clientWidth);
    this._height.set(element.clientHeight);
  }
}
