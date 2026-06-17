import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { AdminStats, SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrls: ['../admin.shared.css']
})
export class AdminShellComponent implements OnInit {
  @Input() title = 'Administration';
  @Input() section: 'users' | 'chefs' | 'sauces' | 'orders' = 'users';
  @Input() loading = false;
  @Output() refresh = new EventEmitter<void>();

  stats: AdminStats | null = null;
  skeletonRows = [1, 2, 3, 4];

  constructor(private router: Router, private alertController: AlertController) {}

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats(force = false) {
    try {
      this.stats = await SupabaseService.getAdminStats(force);
    } catch {
      this.stats = null;
    }
  }

  goTo(section: string) {
    if (section === this.section) return;
    this.router.navigate([`/admin/${section}`]);
  }

  async handleRefresh() {
    await this.loadStats(true);
    this.refresh.emit();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Déconnexion',
      message: 'Voulez-vous quitter le tableau de bord admin ?',
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        {
          text: 'Déconnecter',
          role: 'destructive',
          handler: () => this.confirmLogout()
        }
      ]
    });
    await alert.present();
  }

  private async confirmLogout() {
    await SupabaseService.signOut();
    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }
}
