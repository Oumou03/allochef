import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ChefDetailPageRoutingModule } from './chef-detail-routing.module';
import { ChefDetailPage } from './chef-detail.page';

@NgModule({
  imports: [CommonModule, IonicModule, ChefDetailPageRoutingModule],
  declarations: [ChefDetailPage]
})
export class ChefDetailModule {}
