import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  flame, timeOutline, restaurantOutline, closeOutline, playCircle, sparkles, heart, heartOutline,
  chatbubbleOutline, chatbubbleEllipses, thumbsUpOutline, thumbsUp
} from 'ionicons/icons';
import {
  SupabaseService,
  RecipeItem,
  SauceComment,
  SAUCE_CATEGORIES,
  getSauceCategoryLabel
} from '../../../services/supabase.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.css']
})
export class Tab3Page implements OnInit {
  selectedCategory = 'toutes';
  sauces: RecipeItem[] = [];
  favorites: string[] = [];
  likedSauceIds: string[] = [];
  loading = true;

  showSauceFeedbackModal = false;
  activeSauce: RecipeItem | null = null;
  activeSauceComments: SauceComment[] = [];
  newSauceComment = '';
  commentLoading = false;
  commentSubmitting = false;
  likeLoadingSauceId = '';

  categories = [
    { id: 'toutes', label: '🍲 Toutes', emoji: '🍲' },
    ...SAUCE_CATEGORIES.map(c => ({ id: c.id, label: `${c.emoji} ${c.label}`, emoji: c.emoji }))
  ];

  constructor(private router: Router, private toastController: ToastController) {
    addIcons({
      flame, timeOutline, restaurantOutline, closeOutline, playCircle, sparkles, heart, heartOutline,
      chatbubbleOutline, chatbubbleEllipses, thumbsUpOutline, thumbsUp
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadData();
  }

  async loadData() {
    try {
      this.sauces = await SupabaseService.getSauces();
      this.favorites = await SupabaseService.getFavoriteKeys();
      this.likedSauceIds = await SupabaseService.getLikedSauceIds();
    } catch (error) {
      console.error(error);
    } finally {
      this.loading = false;
    }
  }

  get filteredSauces() {
    return this.selectedCategory === 'toutes'
      ? this.sauces
      : this.sauces.filter(s => s.category === this.selectedCategory);
  }

  setSelectedCategory(catId: string) {
    this.selectedCategory = catId;
  }

  getCategoryLabel(categoryId: string | null | undefined): string {
    return getSauceCategoryLabel(categoryId);
  }

  openSauce(sauce: RecipeItem) {
    this.router.navigate(['/sauce', sauce.id]);
  }

  async toggleSauceLike(sauce: RecipeItem, event: Event) {
    event.stopPropagation();
    this.likeLoadingSauceId = sauce.id;
    try {
      const result = await SupabaseService.toggleSauceLike(sauce);
      sauce.likes = result.likes;
      const likedIndex = this.likedSauceIds.indexOf(sauce.id);
      if (result.liked && likedIndex === -1) {
        this.likedSauceIds = [...this.likedSauceIds, sauce.id];
      } else if (!result.liked && likedIndex !== -1) {
        this.likedSauceIds = this.likedSauceIds.filter(id => id !== sauce.id);
      }
    } catch (error: any) {
      await this.showToast(error?.message || 'Connectez-vous pour liker cette sauce.', 'warning');
    } finally {
      this.likeLoadingSauceId = '';
    }
  }

  async openSauceFeedback(sauce: RecipeItem, event: Event) {
    event.stopPropagation();
    this.activeSauce = sauce;
    this.activeSauceComments = [];
    this.showSauceFeedbackModal = true;
    this.commentLoading = true;
    try {
      this.activeSauceComments = await SupabaseService.getSauceComments(sauce.id);
    } catch (error) {
      console.error(error);
      this.activeSauceComments = [];
    } finally {
      this.commentLoading = false;
    }
  }

  closeSauceFeedback() {
    this.showSauceFeedbackModal = false;
    this.activeSauce = null;
    this.activeSauceComments = [];
    this.newSauceComment = '';
  }

  isSauceLiked(sauceId: string) {
    return this.likedSauceIds.includes(sauceId);
  }

  async submitSauceComment() {
    if (!this.activeSauce) return;
    const content = this.newSauceComment.trim();
    if (!content) return;

    this.commentSubmitting = true;
    try {
      const comment = await SupabaseService.addSauceComment(this.activeSauce.id, content);
      this.activeSauceComments = [comment, ...this.activeSauceComments];
      this.newSauceComment = '';
    } catch (error: any) {
      await this.showToast(error?.message || 'Impossible de publier le commentaire.', 'danger');
    } finally {
      this.commentSubmitting = false;
    }
  }

  formatCommentDate(createdAt: string): string {
    const date = new Date(createdAt);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'À l’instant';
    if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? 'Hier' : `Il y a ${diffDays} j`;
  }

  getCommentAuthorInitial(name?: string | null): string {
    return (name || 'U').charAt(0).toUpperCase();
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({ message, duration: 2500, color, position: 'top' });
    await toast.present();
  }

  async toggleFavorite(sauce: RecipeItem, event: Event) {
    event.stopPropagation();
    const isFavorite = await SupabaseService.toggleFavorite(sauce);
    const key = this.getFavoriteKey(sauce);
    this.favorites = isFavorite
      ? [...new Set([...this.favorites, key])]
      : this.favorites.filter(existing => existing !== key);
  }

  getFavoriteKey(sauce: RecipeItem): string {
    return SupabaseService.getFavoriteKey(sauce);
  }
}
