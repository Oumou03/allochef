import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  mailOutline, lockClosedOutline, personOutline, arrowForward,
  chevronBackOutline, restaurantOutline, bookOutline, logoGoogle
} from 'ionicons/icons';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-register-chef',
  templateUrl: 'register-chef.page.html',
  styleUrls: ['register-chef.page.css']
})
export class RegisterChefPage {
  name = '';
  specialty = '';
  bio = '';
  email = '';
  password = '';
  loading = false;

  constructor(private router: Router, private toastController: ToastController) {
    addIcons({
      mailOutline, lockClosedOutline, personOutline, arrowForward,
      chevronBackOutline, restaurantOutline, bookOutline, logoGoogle
    });
  }

  async handleRegister() {
    if (!this.name?.trim() || !this.specialty?.trim() || !this.bio?.trim() || !this.email?.trim() || !this.password) {
      await this.showToast('Veuillez remplir tous les champs.', 'warning');
      return;
    }

    if (this.password.length < 6) {
      await this.showToast('Le mot de passe doit contenir au moins 6 caracteres.', 'warning');
      return;
    }

    this.loading = true;

    try {
      const data = await SupabaseService.signUpChef(
        this.email.trim(),
        this.password,
        this.name.trim(),
        this.specialty.trim(),
        this.bio.trim()
      );

      if (data.session && data.user) {
        await SupabaseService.ensureUserProfile(data.user);
      }

      localStorage.setItem('allochef_onboarding_completed', 'true');
      await this.showToast('Profil chef cree avec succes !', 'success');
      this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur d\'inscription chef', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async handleGoogleRegister() {
    if (!this.specialty?.trim() || !this.bio?.trim()) {
      await this.showToast('Renseignez votre specialite et biographie avant Google.', 'warning');
      return;
    }

    this.loading = true;

    try {
      await SupabaseService.signInWithGoogle({
        role: 'chef',
        chefMeta: {
          specialty: this.specialty.trim(),
          bio: this.bio.trim()
        }
      });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur Google', 'danger');
      this.loading = false;
    }
  }

  goToLoginChef() {
    this.router.navigate(['/auth/login-chef']);
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
