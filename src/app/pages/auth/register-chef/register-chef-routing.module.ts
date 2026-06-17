import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterChefPage } from './register-chef.page';

const routes: Routes = [
  {
    path: '',
    component: RegisterChefPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisterChefPageRoutingModule {}
