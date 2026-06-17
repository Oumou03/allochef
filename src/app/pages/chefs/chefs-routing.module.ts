import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChefsPage } from './chefs.page';

const routes: Routes = [{ path: '', component: ChefsPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChefsPageRoutingModule {}
