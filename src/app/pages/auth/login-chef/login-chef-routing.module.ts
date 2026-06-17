import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginChefPage } from './login-chef.page';

const routes: Routes = [
  {
    path: '',
    component: LoginChefPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginChefPageRoutingModule {}
