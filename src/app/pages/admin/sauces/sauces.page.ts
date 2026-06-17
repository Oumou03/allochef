import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { RecipeItem, SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-sauces',
  templateUrl: './sauces.page.html',
  styleUrls: ['../admin.shared.css']
})
export class SaucesPage implements OnInit {
  recipes: RecipeItem[] = [];
  sauces: RecipeItem[] = [];
  loading = true;
  selectedItem: RecipeItem | null = null;
  showReviewModal = false;

  constructor(private toastController: ToastController) {}

  async ngOnInit() {
    await this.loadPending();
  }

  async loadPending() {
    this.loading = true;
    try {
      const pending = await SupabaseService.getPendingContent();
      this.recipes = pending.recipes;
      this.sauces = pending.sauces;
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger les contenus', 'danger');
    } finally {
      this.loading = false;
    }
  }

  openReview(item: RecipeItem) {
    this.selectedItem = item;
    this.showReviewModal = true;
  }

  closeReview() {
    this.showReviewModal = false;
    this.selectedItem = null;
  }

  async approve(item: RecipeItem) {
    try {
      await SupabaseService.updateContentStatus(item.id, item.source, 'published');
      await this.showToast('Contenu publié', 'success');
      await this.loadPending();
      this.closeReview();
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'danger');
    }
  }

  async reject(item: RecipeItem) {
    try {
      await SupabaseService.updateContentStatus(item.id, item.source, 'rejected');
      await this.showToast('Contenu rejeté', 'warning');
      await this.loadPending();
      this.closeReview();
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'danger');
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
