import { Component, OnInit, Input } from '@angular/core';
import { Locale } from 'src/app/constants/locale';

@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent implements OnInit {
  constructor() { }
  now: Date = new Date();
  locale = Locale;
  @Input() state: string = "UK";
  @Input() showSecond: any = false;

  ngOnInit(): void {
    console.log(`target locale: ${this.state}`)
    setInterval(() => {
      this.now = new Date();
    });
  }
}
