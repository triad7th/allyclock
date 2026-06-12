import { Component } from '@angular/core';
import { CardComponent } from './faces/world-cards/card/card.component';

@Component({
  selector: 'app-root',
  imports: [CardComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'allyclock';
}
