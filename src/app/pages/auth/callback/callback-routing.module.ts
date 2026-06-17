import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthCallbackPage } from './callback.page';

const routes: Routes = [
  { path: '', component: AuthCallbackPage }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthCallbackPageRoutingModule {}
