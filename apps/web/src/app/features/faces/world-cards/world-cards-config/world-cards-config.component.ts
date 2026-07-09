import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { WorldCardsConfigStore } from '../world-cards-config-store.service';
import { DimensionRegistry } from '@core/dimensions/dimension-registry.service';
import { SheetComponent } from '@shared/ui/sheet/sheet.component';
import { NavHeaderComponent } from '@shared/ui/nav-header/nav-header.component';
import { IconButtonComponent } from '@shared/ui/icon-button/icon-button.component';
import { type WorldCardSizes } from '../world-cards-config';
import { KnobSliderDirective } from '@allyworld/alloy-ui';

/**
 * Resolution-based Adjust panel for World Cards: Time / Date font
 * sizes, tuned for the dimension band that matches the face's current ratio.
 */
@Component({
  selector: 'app-world-cards-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SheetComponent,
    NavHeaderComponent,
    IconButtonComponent,
    DecimalPipe,
    KnobSliderDirective,
  ],
  templateUrl: './world-cards-config.component.html',
  styleUrl: './world-cards-config.component.scss',
})
export class WorldCardsConfigComponent {
  protected readonly store = inject(WorldCardsConfigStore);
  private readonly registry = inject(DimensionRegistry);
  readonly closed = output<void>();
  private readonly sheet = viewChild(SheetComponent);

  readonly ratio = input.required<number>();

  readonly editingBand = computed(() => this.registry.resolveForRatio(this.ratio()));
  readonly editingFields = computed(() => this.store.config(this.editingBand().id));

  close(): void {
    this.sheet()?.close();
  }
  onSheetClosed(): void {
    this.closed.emit();
  }

  onSize(key: keyof WorldCardSizes, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.setSize(this.editingBand().id, key, value);
  }
}
