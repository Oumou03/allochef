import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { OrderRecord, SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-admin-commandes',
  templateUrl: './commandes.page.html',
  styleUrls: ['../admin.shared.css']
})
export class AdminCommandesPage implements OnInit {
  orders: OrderRecord[] = [];
  loading = true;

  constructor(private toastController: ToastController) {}

  async ngOnInit() {
    await this.loadOrders();
  }

  async loadOrders() {
    this.loading = true;
    try {
      this.orders = await SupabaseService.getAllOrders();
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger les commandes', 'danger');
    } finally {
      this.loading = false;
    }
  }

  async updateStatus(order: OrderRecord, status: OrderRecord['status']) {
    try {
      await SupabaseService.updateOrderStatus(order.id, status);
      order.status = status;
      await this.showToast('Statut mis à jour', 'success');
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'danger');
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      preparing: 'En préparation',
      delivered: 'Livrée'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    if (status === 'delivered') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'confirmed' || status === 'preparing') return 'role-chef';
    return 'role-user';
  }

  formatPrice(price: number): string {
    return price.toLocaleString('fr-GN') + ' GNF';
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
