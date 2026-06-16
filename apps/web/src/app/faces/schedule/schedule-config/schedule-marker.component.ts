import { Component, ElementRef, OnDestroy, inject, input, output } from '@angular/core';
import { IconComponent } from '../../../ui/icon/icon.component';

@Component({
  selector: 'app-schedule-marker',
  imports: [IconComponent],
  templateUrl: './schedule-marker.component.html',
  styleUrl: './schedule-marker.component.scss',
})
export class ScheduleMarkerComponent implements OnDestroy {
  private readonly el = inject(ElementRef);

  readonly index = input.required<number>();
  readonly renderedY = input.required<number>();
  readonly moved = output<number>();
  readonly removed = output<void>();

  private dragging = false;
  private startY = 0;
  private startPos = 0;

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const delta = e.clientY - this.startY;
    const newY = Math.max(0, this.startPos + delta);
    this.moved.emit(newY);
  };

  private readonly onPointerUp = (): void => {
    if (!this.dragging) return;
    this.dragging = false;
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  };

  onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.dragging = true;
    this.startY = e.clientY;
    this.startPos = this.renderedY();
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}
