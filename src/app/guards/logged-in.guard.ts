import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class LoggedInGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(): Promise<boolean> {
    const session = await SupabaseService.getSession();
    if (session) return true;

    this.router.navigate(['/auth/login'], { replaceUrl: true });
    return false;
  }
}
