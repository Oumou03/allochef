import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ChefWithUser, SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-chefs',
  templateUrl: './chefs.page.html',
  styleUrls: ['../admin.shared.css']
})
export class ChefsPage implements OnInit {
  chefs: ChefWithUser[] = [];
  loading = true;

  constructor(private toastController: ToastController) {}

  async ngOnInit() {
    await this.loadChefs();
  }

  async loadChefs() {
    this.loading = true;
    try {
      this.chefs = await SupabaseService.getAllChefsWithUsers();
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger les chefs', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async toggleVerify(chef: ChefWithUser) {
    const verified = !chef.is_verified;
    try {
      await SupabaseService.setChefVerified(chef.id, verified);
      chef.is_verified = verified;
      await this.showToast(
        verified ? `${chef.name} validé` : `Validation retirée pour ${chef.name}`,
        'success'
      );
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
