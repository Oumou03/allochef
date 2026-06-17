import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CommandesRoutingModule } from './commandes-routing.module';
import { CommandesPage } from './commandes.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, CommandesRoutingModule],
  declarations: [CommandesPage]
})
export class CommandesModule {}
