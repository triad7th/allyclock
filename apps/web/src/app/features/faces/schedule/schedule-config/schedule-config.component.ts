import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ScheduleStoreService } from '../schedule-store.service';
import { ScheduleSegment } from '../schedule-formatter';
import { DEFAULT_IMAGE_SRC } from '../default-schedule';
import { DEFAULT_PRESET_ID, type SchedulePreset } from '../schedule-preset';
import { ScheduleMarkerComponent } from '../schedule-marker/schedule-marker.component';
import {
  IconComponent,
  IconButtonComponent,
  NavHeaderComponent,
  SheetComponent,
} from '@allyworld/alloy-ui';
import { ContainerSizeDirective } from '@shared/ui/container-size/container-size.directive';

export interface DraftZone {
  from: string;
}

@Component({
  selector: 'app-schedule-config',
  imports: [
    ScheduleMarkerComponent,
    IconComponent,
    IconButtonComponent,
    NavHeaderComponent,
    SheetComponent,
    ContainerSizeDirective,
  ],
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
export class ScheduleConfigComponent implements OnInit, OnDestroy {
  private readonly store = inject(ScheduleStoreService);

  readonly closed = output<void>();

  // Preset list + which one is being edited (always also the active one).
  readonly presets = signal<SchedulePreset[]>([]);
  readonly activeId = signal<string>(DEFAULT_PRESET_ID);
  readonly thumbs = signal<Record<string, string>>({});

  readonly activePreset = computed<SchedulePreset | undefined>(
    () => this.presets().find((p) => p.id === this.activeId()) ?? this.presets()[0],
  );
  readonly hasImage = computed(() => this.activePreset()?.hasImage ?? false);
  // The default preset shows the bundled image; any preset with an uploaded
  // image shows that. Only a brand-new, image-less preset shows the drop-zone.
  readonly showImageStage = computed(
    () => this.hasImage() || this.activePreset()?.id === DEFAULT_PRESET_ID,
  );
  readonly canDelete = computed(() => this.presets().length > 1);

  // Editor state for the active preset.
  readonly previewSrc = signal(DEFAULT_IMAGE_SRC);
  readonly naturalWidth = signal(0);
  readonly naturalHeight = signal(0);
  // The rendered (layout-box) width of the preview <img>, measured by the
  // ContainerSize directive sitting on it. Undefined while the img is hidden
  // behind @if(showImageStage()), which reads as 0.
  readonly renderedWidth = computed(() => this.imgSize()?.width() ?? 0);
  readonly markerSourceY = signal<number[]>([]);
  readonly draftZones = signal<DraftZone[]>([{ from: '00:00' }]);
  readonly renaming = signal(false);

  readonly scale = computed(() => {
    const nw = this.naturalWidth();
    return nw > 0 ? this.renderedWidth() / nw : 0;
  });
  readonly markerRenderedY = computed(() => this.markerSourceY().map((y) => y * this.scale()));
  readonly zoneEndTimes = computed(() => {
    const zones = this.draftZones();
    return zones.map((_, i) => (i < zones.length - 1 ? zones[i + 1].from : '24:00'));
  });
  readonly zoneBands = computed(() => {
    const s = this.scale();
    const nh = this.naturalHeight();
    const bounds = [0, ...this.markerSourceY(), nh];
    return this.draftZones().map((_, i) => {
      const startSrc = bounds[i] ?? 0;
      const endSrc = bounds[i + 1] ?? nh;
      return { top: startSrc * s, height: (endSrc - startSrc) * s };
    });
  });

  private previewObjectUrl: string | null = null;
  private readonly thumbUrls: string[] = [];
  private thumbGeneration = 0;
  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');
  private readonly sheet = viewChild(SheetComponent);
  // Measures the lazily-created preview <img>; returns undefined while the img
  // is hidden behind @if(showImageStage()).
  private readonly imgSize = viewChild(ContainerSizeDirective);

  ngOnInit(): void {
    const state = this.store.loadState();
    this.presets.set(state.presets);
    this.activeId.set(state.activePresetId);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  ngOnDestroy(): void {
    this.revokePreview();
    for (const url of this.thumbUrls) URL.revokeObjectURL(url);
  }

  // ---- Preset selection / lifecycle ----------------------------------------

  selectPreset(id: string): void {
    if (id === this.activeId()) return;
    this.activeId.set(id);
    this.store.setActive(id);
    this.loadEditorForActive();
  }

  addPreset(): void {
    const created = this.store.addPreset();
    this.presets.set(this.store.loadState().presets);
    this.activeId.set(created.id);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  async duplicateActive(): Promise<void> {
    const created = await this.store.duplicatePreset(this.activeId());
    if (!created) return;
    const state = this.store.loadState();
    this.presets.set(state.presets);
    this.activeId.set(state.activePresetId);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  deleteActive(): void {
    this.deletePresetById(this.activeId());
  }

  deletePresetById(id: string): void {
    if (!this.canDelete()) return;
    this.store.deletePreset(id);
    const state = this.store.loadState();
    this.presets.set(state.presets);
    this.activeId.set(state.activePresetId);
    this.loadEditorForActive();
    this.refreshThumbs();
  }

  startRename(): void {
    this.renaming.set(true);
    queueMicrotask(() => this.nameInput()?.nativeElement.focus());
  }

  commitRename(value: string): void {
    if (!this.renaming()) return;
    const name = value.trim();
    this.renaming.set(false);
    if (!name) return;
    this.store.renamePreset(this.activeId(), name);
    this.presets.set(this.store.loadState().presets);
    this.refreshThumbs();
  }

  // Edits commit to the store immediately, so closing the sheet is the only
  // terminal action: the X, the backdrop, and Escape all route through
  // `<app-sheet>` and arrive as `onSheetClosed()` once the exit animation ends.
  close(): void {
    this.sheet()?.close();
  }

  onSheetClosed(): void {
    this.revokePreview();
    this.closed.emit();
  }

  // ---- Editor: image -------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    void this.applyImage(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) void this.applyImage(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async applyImage(file: Blob): Promise<void> {
    const id = this.activeId();
    await this.store.savePresetImage(id, file);
    this.presets.set(this.store.loadState().presets);
    this.revokePreview();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewSrc.set(this.previewObjectUrl);
    this.refreshThumbs();
  }

  onPreviewImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Intrinsic dimensions are not measurable by the ContainerSize directive
    // (it reports the layout box), so read them from the decoded image here.
    this.naturalWidth.set(img.naturalWidth);
    this.naturalHeight.set(img.naturalHeight);
  }

  // ---- Editor: segments ----------------------------------------------------

  addMarker(): void {
    const nh = this.naturalHeight() > 0 ? this.naturalHeight() : 1000;
    const positions = this.markerSourceY();
    const last = positions.length > 0 ? positions[positions.length - 1] : 0;
    const newPos = (last + nh) / 2;
    const next = [...positions, newPos].sort((a, b) => a - b);
    this.markerSourceY.set(next);
    this.rebuildZones(next.length);
    this.persistSegments();
  }

  removeMarker(index: number): void {
    const positions = this.markerSourceY().filter((_, i) => i !== index);
    this.markerSourceY.set(positions);
    this.rebuildZones(positions.length);
    this.persistSegments();
  }

  updateMarkerPosition(index: number, renderedY: number): void {
    const s = this.scale();
    if (s <= 0) return;
    const positions = [...this.markerSourceY()];
    positions[index] = renderedY / s;
    positions.sort((a, b) => a - b);
    this.markerSourceY.set(positions);
    this.persistSegments();
  }

  updateZoneFrom(zoneIndex: number, value: string): void {
    const zones = [...this.draftZones()];
    zones[zoneIndex] = { from: value };
    this.draftZones.set(zones);
    this.persistSegments();
  }

  buildSegments(): ScheduleSegment[] {
    const nh = this.naturalHeight() > 0 ? this.naturalHeight() : 1000;
    const bounds = [0, ...this.markerSourceY(), nh];
    const zones = this.draftZones();
    return zones.map((zone, i) => ({
      pixelStart: Math.round(bounds[i]),
      pixelEnd: Math.round(bounds[i + 1]),
      timeStart: zone.from,
      timeEnd: i < zones.length - 1 ? zones[i + 1].from : '24:00',
    }));
  }

  private persistSegments(): void {
    this.store.updateSegments(this.activeId(), this.buildSegments());
  }

  // ---- Helpers -------------------------------------------------------------

  private loadEditorForActive(): void {
    const preset = this.activePreset();
    this.renaming.set(false);
    this.naturalWidth.set(0);
    this.naturalHeight.set(0);
    if (preset) this.initDraftFromSegments(preset.segments);
    this.revokePreview();
    this.previewSrc.set(DEFAULT_IMAGE_SRC);
    if (preset?.hasImage) {
      const requestedId = preset.id;
      this.store.loadPresetImage(preset.id).then((url) => {
        if (!url) return;
        if (requestedId !== this.activeId()) {
          URL.revokeObjectURL(url);
          return;
        }
        this.revokePreview();
        this.previewObjectUrl = url;
        this.previewSrc.set(url);
      });
    }
  }

  private initDraftFromSegments(segs: ScheduleSegment[]): void {
    if (segs.length === 0) {
      this.markerSourceY.set([]);
      this.draftZones.set([{ from: '00:00' }]);
      return;
    }
    this.markerSourceY.set(segs.slice(0, -1).map((s) => s.pixelEnd));
    this.draftZones.set(segs.map((s) => ({ from: s.timeStart })));
  }

  private rebuildZones(markerCount: number): void {
    const current = this.draftZones();
    const zones: DraftZone[] = [];
    for (let i = 0; i <= markerCount; i++) {
      zones.push(current[i] ?? { from: '00:00' });
    }
    this.draftZones.set(zones);
  }

  private revokePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  // Thumbnail src per preset: stored image (object URL), the bundled default for
  // the default preset, or empty (placeholder rendered by the template).
  private refreshThumbs(): void {
    for (const url of this.thumbUrls) URL.revokeObjectURL(url);
    this.thumbUrls.length = 0;
    const generation = ++this.thumbGeneration;
    const next: Record<string, string> = {};
    for (const preset of this.presets()) {
      if (!preset.hasImage) {
        if (preset.id === DEFAULT_PRESET_ID) next[preset.id] = DEFAULT_IMAGE_SRC;
        continue;
      }
      this.store.loadPresetImage(preset.id).then((url) => {
        if (!url) return;
        if (generation !== this.thumbGeneration) {
          URL.revokeObjectURL(url);
          return;
        }
        this.thumbUrls.push(url);
        this.thumbs.set({ ...this.thumbs(), [preset.id]: url });
      });
    }
    this.thumbs.set(next);
  }

  thumbFor(id: string): string | null {
    return this.thumbs()[id] ?? null;
  }
}
