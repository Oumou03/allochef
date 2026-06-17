import { APP_INITIALIZER, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  restaurantOutline,
  bookOutline,
  cartOutline,
  refreshOutline,
  shieldCheckmarkOutline,
  banOutline,
  checkmarkCircleOutline,
  eyeOutline,
  closeOutline,
  documentTextOutline,
  logOutOutline
} from 'ionicons/icons';
import { AdminRoutingModule } from './admin-routing.module';
import { UsersPage } from './users/users.page';
import { SaucesPage } from './sauces/sauces.page';
import { VideosPage } from './videos/videos.page';
import { ChefsPage } from './chefs/chefs.page';
import { AdminCommandesPage } from './commandes/commandes.page';
import { AdminShellComponent } from './admin-shell/admin-shell.component';

function registerAdminIcons() {
  return () => {
    addIcons({
      peopleOutline,
      restaurantOutline,
      bookOutline,
      cartOutline,
      refreshOutline,
      shieldCheckmarkOutline,
      banOutline,
      checkmarkCircleOutline,
      eyeOutline,
      closeOutline,
      documentTextOutline,
      logOutOutline
    });
  };
}

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, AdminRoutingModule],
  declarations: [
    AdminShellComponent,
    UsersPage,
    SaucesPage,
    VideosPage,
    ChefsPage,
    AdminCommandesPage
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: registerAdminIcons, multi: true }
  ]
})
export class AdminModule {}
