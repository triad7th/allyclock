import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ScheduleStoreService } from '../schedule-store.service';
import { ScheduleSegment } from '../schedule-formatter';
import { DEFAULT_IMAGE_SRC, DEFAULT_SEGMENTS } from '../default-schedule';
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
export class ScheduleConfigComponent implements OnInit {
  private readonly store = inject(ScheduleStoreService);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  readonly previewSrc = signal(DEFAULT_IMAGE_SRC);
  readonly naturalWidth = signal(400);
  readonly naturalHeight = signal(1000);

  // markerPositions: Y positions in rendered-preview pixels, sorted ascending
  // zones.length === markerPositions.length + 1
  readonly markerPositions = signal<number[]>([]);
  readonly draftZones = signal<DraftZone[]>([{ timeStart: '00:00', timeEnd: '24:00' }]);

  private pendingBlob: Blob | null = null;
  private previewObjectUrl: string | null = null;

  ngOnInit(): void {
    const segs = this.store.loadSegments();
    this.initDraftFromSegments(segs);
    this.store.loadImage().then((url) => {
      if (url) {
        this.previewObjectUrl = url;
        this.previewSrc.set(url);
      }
    });
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
    const segments = this.buildSegments();
    this.store.saveSegments(segments);
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
    const positions = [...this.markerPositions()];
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedHeight = previewEl?.offsetHeight ?? this.naturalHeight();
    const mid = renderedHeight / 2;
    positions.push(mid);
    positions.sort((a, b) => a - b);
    this.markerPositions.set(positions);
    this.rebuildZones(positions);
  }

  removeMarker(index: number): void {
    const positions = this.markerPositions().filter((_, i) => i !== index);
    this.markerPositions.set(positions);
    this.rebuildZones(positions);
  }

  updateMarkerPosition(index: number, renderedY: number): void {
    const positions = [...this.markerPositions()];
    positions[index] = renderedY;
    positions.sort((a, b) => a - b);
    this.markerPositions.set(positions);
  }

  updateZoneTime(zoneIndex: number, field: 'timeStart' | 'timeEnd', value: string): void {
    const zones = [...this.draftZones()];
    zones[zoneIndex] = { ...zones[zoneIndex], [field]: value };
    this.draftZones.set(zones);
  }

  buildSegments(): ScheduleSegment[] {
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedHeight = previewEl?.offsetHeight ?? this.naturalHeight();
    const scaleToSource = this.naturalHeight() / renderedHeight;

    const positions = this.markerPositions();
    const zones = this.draftZones();
    const segments: ScheduleSegment[] = [];

    for (let i = 0; i <= positions.length; i++) {
      const pixelStart = i === 0 ? 0 : Math.round(positions[i - 1] * scaleToSource);
      const pixelEnd =
        i === positions.length
          ? this.naturalHeight()
          : Math.round(positions[i] * scaleToSource);
      segments.push({
        pixelStart,
        pixelEnd,
        timeStart: zones[i]?.timeStart ?? '00:00',
        timeEnd: zones[i]?.timeEnd ?? '24:00',
      });
    }
    return segments;
  }

  private initDraftFromSegments(segs: ScheduleSegment[]): void {
    if (segs.length === 0) {
      this.markerPositions.set([]);
      this.draftZones.set([{ timeStart: '00:00', timeEnd: '24:00' }]);
      return;
    }
    const nh = this.naturalHeight();
    const previewEl = document.querySelector('.marker-preview-img') as HTMLImageElement | null;
    const renderedH = previewEl?.offsetHeight ?? nh;
    const scale = renderedH / nh;

    const positions = segs.slice(0, -1).map((s) => s.pixelEnd * scale);
    const zones = segs.map((s) => ({ timeStart: s.timeStart, timeEnd: s.timeEnd }));
    this.markerPositions.set(positions);
    this.draftZones.set(zones);
  }

  private rebuildZones(positions: number[]): void {
    const currentZones = this.draftZones();
    const newZones: DraftZone[] = [];
    for (let i = 0; i <= positions.length; i++) {
      newZones.push(currentZones[i] ?? { timeStart: '00:00', timeEnd: '24:00' });
    }
    this.draftZones.set(newZones);
  }
}
