import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'allyclock';
  now: Date = new Date();
  flags = {
    "US": "https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/USA-128.png",
    'UK': "https://cdn4.iconfinder.com/data/icons/rounded-square-national-flags/512/GREAT_BRITAIN-128.png",
    'KR': "https://cdn1.iconfinder.com/data/icons/rounded-square-national-flags/512/SOUTH_KOREA-128.png"
  }

  ngOnInit(): void {
    setInterval(() => {
      this.now = new Date();
    });
  }

}
