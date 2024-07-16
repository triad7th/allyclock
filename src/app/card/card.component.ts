import { Component, Input, OnInit } from '@angular/core';
import { LocationService } from '../services/location.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent implements OnInit {
  now: Date = new Date();
  @Input() state: string = 'UK';
  constructor(public location: LocationService) {}

  ngOnInit(): void {
    console.log(`target locale: ${this.state}`);
    setInterval(() => {
      this.now = new Date();
    });
  }

  getTimeZone(): string {
    return this.location.getTimeZone(this.state, this.now);
    //return "UTC";
  }

  getFlag(): string {
    return this.location.getFlag(this.state);
  }
}
