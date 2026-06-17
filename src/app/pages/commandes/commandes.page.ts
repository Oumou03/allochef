import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, receiptOutline } from 'ionicons/icons';
import { OrderItemRecord, OrderRecord, SupabaseService } from '../../services/supabase.service';

interface CartItem extends OrderItemRecord {
  selected: boolean;
}

@Component({
  selector: 'app-commandes',
  templateUrl: './commandes.page.html',
  styleUrls: ['./commandes.page.css']
})
export class CommandesPage implements OnInit {
  activeTab: 'new' | 'history' = 'history';
  recipeName = '';
  recipeId = '';
  loading = false;
  placingOrder = false;

  cartItems: CartItem[] = [];
  orders: OrderRecord[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private alertController: AlertController
  ) {
    addIcons({ arrowBackOutline, receiptOutline });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(async params => {
      if (params['recipeId']) {
        this.recipeId = params['recipeId'];
        this.recipeName = params['recipeName'] || 'Recette';
        this.activeTab = 'new';
        await this.loadIngredientsForRecipe();
      }
      await this.loadOrderHistory();
    });
  }

  async loadIngredientsForRecipe() {
    this.loading = true;
    try {
      const recipe = await SupabaseService.getRecipeById(this.recipeId);
      const ingredients = recipe?.ingredients ?? [];
      this.cartItems = SupabaseService.buildCartFromIngredients(ingredients).map(item => ({
        ...item,
        selected: true
      }));
    } catch (e) {
      console.error(e);
      this.cartItems = [];
    } finally {
      this.loading = false;
    }
  }

  async loadOrderHistory() {
    this.orders = await SupabaseService.getUserOrders();
  }

  get selectedItems(): CartItem[] {
    return this.cartItems.filter(i => i.selected);
  }

  get cartTotal(): number {
    return this.selectedItems.reduce((sum, i) => sum + i.price, 0);
  }

  toggleItem(item: CartItem) {
    item.selected = !item.selected;
  }

  selectAll() {
    this.cartItems.forEach(i => i.selected = true);
  }

  deselectAll() {
    this.cartItems.forEach(i => i.selected = false);
  }

  async placeOrder() {
    if (this.selectedItems.length === 0) return;

    this.placingOrder = true;
    try {
      const orderTotal = this.cartTotal;
      await SupabaseService.createOrder(
        this.recipeName,
        this.recipeId,
        this.selectedItems.map(({ name, quantity, unit, price }) => ({ name, quantity, unit, price }))
      );
      await this.loadOrderHistory();

      const alert = await this.alertController.create({
        header: 'Commande effectuée !',
        message: `Votre commande pour « ${this.recipeName} » a bien été enregistrée. Total : ${this.formatPrice(orderTotal)}`,
        buttons: [
          {
            text: 'Voir mes commandes',
            handler: () => {
              this.activeTab = 'history';
            }
          },
          {
            text: 'OK',
            role: 'cancel',
            handler: () => {
              this.goBack();
            }
          }
        ]
      });
      await alert.present();

      this.cartItems = [];
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de passer la commande', 'danger');
    } finally {
      this.placingOrder = false;
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

  formatPrice(price: number): string {
    return price.toLocaleString('fr-GN') + ' GNF';
  }

  goBack() {
    if (this.recipeId) {
      this.router.navigate(['/sauce', this.recipeId]);
      return;
    }
    this.router.navigate(['/tabs/tab1']);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }
}
