import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { TimeZoneOption } from '@core/zone-catalog';

// Searchable zone list: a search box over a scrollable, filtered list. Live-apply
// on tap (emits picked immediately — no draft/commit). Hosts supply the options
// (incl. any synthetic leading entry like "Follow Time Machine") and the selected
// id, and place this inside their own sheet/sub-view with a back/cancel control.
@Component({
  selector: 'app-zone-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './zone-picker.component.html',
  styleUrl: './zone-picker.component.scss',
})
export class ZonePickerComponent {
  readonly options = input.required<TimeZoneOption[]>();
  readonly selectedId = input<string>('');
  readonly picked = output<string>();

  readonly query = signal('');
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.options();
    return q ? all.filter((z) => z.label.toLowerCase().includes(q)) : all;
  });

  pick(id: string): void {
    this.picked.emit(id);
  }
}
