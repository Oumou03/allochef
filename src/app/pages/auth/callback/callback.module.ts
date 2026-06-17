import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthCallbackPageRoutingModule } from './callback-routing.module';
import { AuthCallbackPage } from './callback.page';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    AuthCallbackPageRoutingModule
  ],
  declarations: [AuthCallbackPage]
})
export class AuthCallbackModule {}
