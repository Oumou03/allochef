import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { SupabaseService, UserProfile } from '../../../services/supabase.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['../admin.shared.css']
})
export class UsersPage implements OnInit {
  users: UserProfile[] = [];
  loading = true;

  constructor(private toastController: ToastController) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.loading = true;
    try {
      this.users = await SupabaseService.getAllUsers();
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger les utilisateurs', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async toggleBan(user: UserProfile) {
    const banned = !user.is_banned;
    try {
      await SupabaseService.setUserBanned(user.id, banned);
      user.is_banned = banned;
      await this.showToast(
        banned ? `${user.name} a été banni` : `${user.name} a été débanni`,
        'success'
      );
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'danger');
    }
  }

  getRoleLabel(user: UserProfile): string {
    if (user.is_admin || user.role === 'admin') return 'Admin';
    if (user.role === 'chef') return 'Chef';
    return 'Utilisateur';
  }

  getRoleClass(user: UserProfile): string {
    if (user.is_admin || user.role === 'admin') return 'role-admin';
    if (user.role === 'chef') return 'role-chef';
    return 'role-user';
  }

  getInitials(name: string): string {
    return (name || 'U').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
