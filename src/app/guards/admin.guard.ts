import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    try {
      const user = await SupabaseService.getUser();
      if (user) {
        const profile = await SupabaseService.getUserProfile(user.id);
        if (profile?.is_admin || profile?.role === 'admin') {
          return true;
        }
      }
    } catch (e) {
      console.error('Admin guard error', e);
    }
    // Not admin – redirect to login
    this.router.navigate(['/auth/login']);
    return false;
  }
}
