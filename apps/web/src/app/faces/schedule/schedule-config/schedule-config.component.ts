import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';
import { ScheduleStoreService } from '../schedule-store.service';
import { ScheduleSegment } from '../schedule-formatter';
import { DEFAULT_IMAGE_SRC } from '../default-schedule';
import { ScheduleMarkerComponent } from './schedule-marker.component';

export interface DraftZone {
  timeStart: string;
  timeEnd: string;
}

@Component({
  selector: 'app-schedule-config',
  imports: [ScheduleMarkerComponent],
  templateUrl: './schedule-config.component.html',
  styleUrl: './schedule-config.component.scss',
})
export class ScheduleConfigComponent implements OnInit, OnDestroy {
  private readonly store = inject(ScheduleStoreService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly previewSrc = signal(DEFAULT_IMAGE_SRC);
  readonly naturalWidth = signal(0);
  readonly naturalHeight = signal(0);
  readonly renderedWidth = signal(0);

  // Boundary positions in SOURCE-image pixels, sorted ascending.
  // draftZones.length === markerSourceY.length + 1
  readonly markerSourceY = signal<number[]>([]);
  readonly draftZones = signal<DraftZone[]>([{ timeStart: '00:00', timeEnd: '24:00' }]);

  // Uniform source-pixel -> rendered-pixel scale. Reactive, so it is correct
  // regardless of when the image finishes loading.
  readonly scale = computed(() => {
    const nw = this.naturalWidth();
    return nw > 0 ? this.renderedWidth() / nw : 0;
  });

  // Rendered Y for each boundary marker.
  readonly markerRenderedY = computed(() => this.markerSourceY().map((y) => y * this.scale()));

  // One rendered band per draft zone: { top, height } in rendered px.
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

  private pendingBlob: Blob | null = null;
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    this.initDraftFromSegments(this.store.loadSegments());
    this.store.loadImage().then((url) => {
      if (url) {
        this.previewObjectUrl = url;
        this.previewSrc.set(url);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.pendingBlob = file;
    if (this.previewObjectUrl) URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewSrc.set(this.previewObjectUrl);
  }

  onPreviewImageLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    this.naturalWidth.set(img.naturalWidth);
    this.naturalHeight.set(img.naturalHeight);
    this.renderedWidth.set(img.clientWidth);
  }

  async removeImage(): Promise<void> {
    this.pendingBlob = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    await this.store.removeImage();
    this.previewSrc.set(DEFAULT_IMAGE_SRC);
  }

  async save(): Promise<void> {
    if (this.pendingBlob) {
      await this.store.saveImage(this.pendingBlob);
      this.pendingBlob = null;
    }
    this.store.saveSegments(this.buildSegments());
    this.saved.emit();
  }

  cancel(): void {
    if (this.pendingBlob && this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
      this.pendingBlob = null;
    }
    this.cancelled.emit();
  }

  addMarker(): void {
    const nh = this.naturalHeight();
    const mid = nh > 0 ? nh / 2 : 500;
    const positions = [...this.markerSourceY(), mid].sort((a, b) => a - b);
    this.markerSourceY.set(positions);
    this.rebuildZones(positions.length);
  }

  removeMarker(index: number): void {
    const positions = this.markerSourceY().filter((_, i) => i !== index);
    this.markerSourceY.set(positions);
    this.rebuildZones(positions.length);
  }

  updateMarkerPosition(index: number, renderedY: number): void {
    const s = this.scale();
    if (s <= 0) return;
    const positions = [...this.markerSourceY()];
    positions[index] = renderedY / s;
    positions.sort((a, b) => a - b);
    this.markerSourceY.set(positions);
  }

  updateZoneTime(zoneIndex: number, field: 'timeStart' | 'timeEnd', value: string): void {
    const zones = [...this.draftZones()];
    zones[zoneIndex] = { ...zones[zoneIndex], [field]: value };
    this.draftZones.set(zones);
  }

  buildSegments(): ScheduleSegment[] {
    const nh = this.naturalHeight() > 0 ? this.naturalHeight() : 1000;
    const bounds = [0, ...this.markerSourceY(), nh];
    return this.draftZones().map((zone, i) => ({
      pixelStart: Math.round(bounds[i]),
      pixelEnd: Math.round(bounds[i + 1]),
      timeStart: zone.timeStart,
      timeEnd: zone.timeEnd,
    }));
  }

  private initDraftFromSegments(segs: ScheduleSegment[]): void {
    if (segs.length === 0) {
      this.markerSourceY.set([]);
      this.draftZones.set([{ timeStart: '00:00', timeEnd: '24:00' }]);
      return;
    }
    this.markerSourceY.set(segs.slice(0, -1).map((s) => s.pixelEnd));
    this.draftZones.set(segs.map((s) => ({ timeStart: s.timeStart, timeEnd: s.timeEnd })));
  }

  private rebuildZones(markerCount: number): void {
    const current = this.draftZones();
    const zones: DraftZone[] = [];
    for (let i = 0; i <= markerCount; i++) {
      zones.push(current[i] ?? { timeStart: '00:00', timeEnd: '24:00' });
    }
    this.draftZones.set(zones);
  }
}
