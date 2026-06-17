import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AdminGuard } from './guards/admin.guard';

const routes: Routes = [
  { path: '', redirectTo: 'splash', pathMatch: 'full' },
  { path: 'splash', loadChildren: () => import('./pages/splash/splash.module').then(m => m.SplashModule) },
  { path: 'onboarding', loadChildren: () => import('./pages/onboarding/onboarding.module').then(m => m.OnboardingModule) },
  { path: 'tabs', loadChildren: () => import('./pages/tabs/tabs.module').then(m => m.TabsModule) },
  { path: 'auth', loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthModule) },
  { path: 'recipe/:id', loadChildren: () => import('./pages/recipe-detail/recipe-detail.module').then(m => m.RecipeDetailModule) },
  { path: 'sauce/:id', loadChildren: () => import('./pages/recipe-detail/recipe-detail.module').then(m => m.RecipeDetailModule) },
  { path: 'chef/:id', loadChildren: () => import('./pages/chef-detail/chef-detail.module').then(m => m.ChefDetailModule) },
  { path: 'chefs', loadChildren: () => import('./pages/chefs/chefs.module').then(m => m.ChefsModule) },
  { path: 'notifications', loadChildren: () => import('./pages/notifications/notifications.module').then(m => m.NotificationsModule) },
  { path: 'commandes', loadChildren: () => import('./pages/commandes/commandes.module').then(m => m.CommandesModule) },
  {
    path: 'admin',
    canActivate: [AdminGuard],
    loadChildren: () => import('./pages/admin/admin.module').then(m => m.AdminModule)
  },
  { path: '**', redirectTo: 'tabs/tab5' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
