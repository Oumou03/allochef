import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChefsPageRoutingModule } from './chefs-routing.module';
import { ChefsPage } from './chefs.page';

@NgModule({
  imports: [CommonModule, IonicModule, ChefsPageRoutingModule],
  declarations: [ChefsPage]
})
export class ChefsModule {}
