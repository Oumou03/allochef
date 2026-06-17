import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, personOutline, arrowForward, logoGoogle } from 'ionicons/icons';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  styleUrls: ['register.page.css']
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  loading = false;

  constructor(private router: Router, private toastController: ToastController) {
    addIcons({
      mailOutline, lockClosedOutline, personOutline, arrowForward, logoGoogle
    });
  }

  async handleRegister() {
    if (!this.name?.trim() || !this.email?.trim() || !this.password) {
      await this.showToast('Veuillez remplir tous les champs.', 'warning');
      return;
    }

    if (this.password.length < 6) {
      await this.showToast('Le mot de passe doit contenir au moins 6 caracteres.', 'warning');
      return;
    }

    this.loading = true;
    try {
      const data = await SupabaseService.signUp(
        this.email.trim(),
        this.password,
        this.name.trim()
      );

      if (data.session && data.user) {
        await SupabaseService.ensureUserProfile(data.user);
      }

      localStorage.setItem('allochef_onboarding_completed', 'true');
      await this.showToast('Inscription reussie !', 'success');
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur d\'inscription', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async handleGoogleRegister() {
    this.loading = true;
    try {
      await SupabaseService.signInWithGoogle({ role: 'user' });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur Google', 'danger');
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
