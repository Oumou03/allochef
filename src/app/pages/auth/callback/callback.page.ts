import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-auth-callback',
  templateUrl: 'callback.page.html',
  styleUrls: ['callback.page.css']
})
export class AuthCallbackPage implements OnInit {
  errorMessage = '';

  constructor(private router: Router) {}

  async ngOnInit() {
    try {
      const { profile } = await SupabaseService.completeOAuthSession();
      const route = SupabaseService.getPostAuthRoute(profile);

      localStorage.setItem('allochef_onboarding_completed', 'true');
      this.router.navigate(route.length ? route : ['/tabs/tab1'], { replaceUrl: true });
    } catch (err: any) {
      console.error('OAuth callback error', err);
      this.errorMessage = err.message || 'Erreur lors de la connexion Google.';
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
