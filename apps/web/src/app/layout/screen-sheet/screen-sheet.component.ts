import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  viewChild,
} from '@angular/core';
import { FACES, FaceDescriptor } from '@features/faces/face-registry';
import { ScreensService } from '@core/screens/screens.service';
import {
  SheetComponent,
  IconComponent,
  NavHeaderComponent,
  IconButtonComponent,
} from '@allyworld/alloy-ui';

@Component({
  selector: 'app-screen-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgComponentOutlet,
    SheetComponent,
    IconComponent,
    NavHeaderComponent,
    IconButtonComponent,
  ],
  templateUrl: './screen-sheet.component.html',
  styleUrl: './screen-sheet.component.scss',
})
export class ScreenSheetComponent {
  private readonly screens = inject(ScreensService);
  readonly closed = output<void>();
  private readonly sheet = viewChild.required(SheetComponent);

  readonly list = this.screens.screens;
  readonly canRemove = computed(() => this.list().length > 1);
  readonly atCap = computed(() => this.list().length >= this.screens.maxScreens());

  faceFor(id: string): FaceDescriptor {
    return FACES.find((f) => f.id === id) ?? FACES[0];
  }
  injectorFor(id: number) {
    return this.screens.injectorFor(id);
  }

  jumpTo(index: number): void {
    this.screens.setActiveIndex(index);
    this.close();
  }
  add(): void {
    this.screens.addScreen();
  }
  remove(id: number, event: Event): void {
    event.stopPropagation();
    this.screens.removeScreen(id);
  }

  close(): void {
    this.sheet().close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }
}
