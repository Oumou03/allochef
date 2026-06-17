import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit {
  constructor() {
    this.initializeApp();
  }

  ngOnInit() {
  }

  initializeApp() {
    // Initialiser Ionic et autres éléments
    const isDarkMode = localStorage.getItem('allochef_dark_mode') === 'true';
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }
}
