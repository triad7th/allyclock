import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ContainerSizeDirective } from '@shared/ui/container-size/container-size.directive';
import { AutoHideDirective } from '@shared/ui/auto-hide.directive';
import { IconComponent } from '@shared/ui/icon/icon.component';
import { FaceConfigService } from '@core/face-config.service';
import { WorldCardsConfigStore } from './world-cards-config-store.service';
import { type WorldCardConfig } from './world-cards-config';
import { CardComponent } from './card/card.component';
import { WorldCardsSettingsComponent } from './world-cards-settings/world-cards-settings.component';
import { WorldCardsConfigComponent } from './world-cards-config/world-cards-config.component';

@Component({
  selector: 'app-world-cards-face',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    WorldCardsSettingsComponent,
    WorldCardsConfigComponent,
    AutoHideDirective,
    IconComponent,
  ],
  hostDirectives: [ContainerSizeDirective],
  templateUrl: './world-cards-face.component.html',
  styleUrl: './world-cards-face.component.scss',
})
export class WorldCardsFaceComponent implements OnDestroy {
  private readonly size = inject(ContainerSizeDirective);
  protected readonly store = inject(WorldCardsConfigStore);
  protected readonly faceConfig = inject(FaceConfigService);

  readonly ratio = computed(() => {
    const h = this.size.height();
    return h > 0 ? this.size.width() / h : 1;
  });
  readonly activeFields = computed(() => this.store.fieldsFor(this.ratio()));
  readonly cards = computed(() => this.activeFields().cards);

  readonly lines = computed<WorldCardConfig[][]>(() => {
    const rows: WorldCardConfig[][] = [];
    let row: WorldCardConfig[] = [];
    for (const card of this.cards()) {
      row.push(card);
      if (card.lineBreak) {
        rows.push(row);
        row = [];
      }
    }
    if (row.length) rows.push(row);
    return rows;
  });

  readonly styleVars = computed<Record<string, string>>(() => {
    const s = this.activeFields().sizes;
    return {
      '--wc-time-scale': `${s.time}`,
      '--wc-date-scale': `${s.date}`,
    };
  });

  // Settings (gear) is owned locally; Adjust is driven by the shell via faceConfig.
  readonly settingsOpen = signal(false);

  ngOnDestroy(): void {
    this.faceConfig.open.set(false);
    this.faceConfig.adjustOpen.set(false);
  }

  openSettings(): void {
    this.settingsOpen.set(true);
    this.faceConfig.open.set(true);
  }
  closeSettings(): void {
    this.settingsOpen.set(false);
    this.faceConfig.open.set(false);
  }
  closeAdjust(): void {
    this.faceConfig.adjustOpen.set(false);
    this.faceConfig.open.set(false);
  }
}
