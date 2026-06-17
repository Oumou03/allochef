import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(): Promise<boolean> {
    try {
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        // User already logged in, redirect to profile tab
        this.router.navigate(['/tabs/tab5'], { replaceUrl: true });
        return false;
      }
    } catch (e) {
      console.error('AuthGuard error', e);
    }
    // Not logged in, allow navigation to login/register pages
    return true;
  }
}
