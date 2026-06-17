import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class NonAdminTabsGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      const user = await SupabaseService.getUser();
      if (!user) return true;

      const profile = await SupabaseService.getUserProfile(user.id);
      if (profile?.is_admin || profile?.role === 'admin') {
        return this.router.createUrlTree(['/admin/users']);
      }
    } catch {
      // Allow access if role check fails
    }
    return true;
  }
}
