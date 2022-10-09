import { Component, OnInit, Input } from '@angular/core';
import { LocationService } from 'src/app/services/location.service';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
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
