import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, logoGoogle, arrowForward } from 'ionicons/icons';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.css']
})
export class LoginPage {
  email = '';
  password = '';
  loading = false;

  constructor(
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      logoGoogle,
      arrowForward
    });
  }

  async handleLogin() {
    if (!this.email?.trim() || !this.password) {
      await this.showToast('Veuillez remplir tous les champs.', 'warning');
      return;
    }

    this.loading = true;

    try {
      const data = await SupabaseService.signIn(this.email.trim(), this.password);
      const user = data?.user;

      if (!user) {
        throw new Error('Session introuvable. Vérifiez votre email de confirmation.');
      }

      const profile = await SupabaseService.ensureUserProfile(user);
      const route = SupabaseService.getPostAuthRoute(profile);
      this.router.navigate(route, { replaceUrl: true });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur de connexion', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async handleForgotPassword() {
    const alert = await this.alertController.create({
      header: 'Mot de passe oublié',
      message: 'Entrez votre email pour recevoir un lien de réinitialisation.',
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'exemple@email.com',
          value: this.email
        }
      ],
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Envoyer',
          handler: async (data) => {
            if (!data.email?.trim()) {
              await this.showToast('Veuillez entrer votre email.', 'warning');
              return false;
            }
            try {
              await SupabaseService.resetPassword(data.email.trim());
              await this.showToast('Email de réinitialisation envoyé !', 'success');
            } catch (error: any) {
              await this.showToast(error.message, 'danger');
            }
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async handleGoogleLogin() {
    this.loading = true;
    try {
      await SupabaseService.signInWithGoogle({ role: 'user' });
    } catch (error: any) {
      await this.showToast(error.message || 'Erreur Google', 'danger');
      this.loading = false;
    }
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
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
