import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsersPage } from './users/users.page';
import { SaucesPage } from './sauces/sauces.page';
import { VideosPage } from './videos/videos.page';
import { ChefsPage } from './chefs/chefs.page';
import { AdminCommandesPage } from './commandes/commandes.page';

const routes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  { path: 'users', component: UsersPage },
  { path: 'sauces', component: SaucesPage },
  { path: 'chefs', component: ChefsPage },
  { path: 'videos', component: VideosPage },
  { path: 'orders', component: AdminCommandesPage },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
