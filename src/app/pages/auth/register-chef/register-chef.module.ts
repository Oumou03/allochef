import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RegisterChefPageRoutingModule } from './register-chef-routing.module';
import { RegisterChefPage } from './register-chef.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegisterChefPageRoutingModule
  ],
  declarations: [RegisterChefPage]
})
export class RegisterChefModule {}
