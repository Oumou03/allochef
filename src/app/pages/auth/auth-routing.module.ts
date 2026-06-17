import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '../../guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./login/login.module').then(m => m.LoginModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'register',
    loadChildren: () => import('./register/register.module').then(m => m.RegisterModule),
    canActivate: [AuthGuard]
  },
  { path: 'callback', loadChildren: () => import('./callback/callback.module').then(m => m.AuthCallbackModule) },
  { path: 'login-chef', loadChildren: () => import('./login-chef/login-chef.module').then(m => m.LoginChefModule) },
  { path: 'register-chef', loadChildren: () => import('./register-chef/register-chef.module').then(m => m.RegisterChefModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule {}
