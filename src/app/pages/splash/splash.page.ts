import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-splash',
  templateUrl: 'splash.page.html',
  styleUrls: ['splash.page.css']
})
export class SplashPage implements OnInit {

  constructor(private router: Router) { }

  async ngOnInit() {
    // Wait a moment for any async init
    setTimeout(async () => {
      const onboardingCompleted = localStorage.getItem('allochef_onboarding_completed');
      if (!onboardingCompleted) {
        this.router.navigate(['/onboarding'], { replaceUrl: true });
        return;
      }
      // If user already logged in, route by role
      const user = await SupabaseService.getCurrentUser();
      if (user) {
        const profile = await SupabaseService.ensureUserProfile(user);
        const route = SupabaseService.getPostAuthRoute(profile);
        this.router.navigate(route, { replaceUrl: true });
      } else {
        // If not logged in, go to login page
        this.router.navigate(['/auth/login'], { replaceUrl: true });
      }
    }, 3000);
  }
}
