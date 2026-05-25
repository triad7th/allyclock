import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LocationService } from '../services/location.service';

@Component({
  selector: 'app-card',
  imports: [DatePipe],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent implements OnInit {
  private location = inject(LocationService);

  readonly state = input<string>('UK');
  readonly now = signal(new Date());
  readonly timeZone = computed(() => this.location.getTimeZone(this.state(), this.now()));
  readonly flag = computed(() => this.location.getFlag(this.state()));

  ngOnInit(): void {
    setInterval(() => this.now.set(new Date()), 100);
  }
}
