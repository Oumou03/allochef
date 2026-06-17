import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LoginChefPageRoutingModule } from './login-chef-routing.module';
import { LoginChefPage } from './login-chef.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LoginChefPageRoutingModule
  ],
  declarations: [LoginChefPage]
})
export class LoginChefModule {}
