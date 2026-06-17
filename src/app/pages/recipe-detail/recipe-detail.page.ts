import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  flameOutline,
  peopleOutline,
  heart,
  heartOutline,
  eyeOutline,
  videocamOutline,
  downloadOutline,
  leafOutline,
  cartOutline,
  constructOutline,
  listOutline,
  restaurantOutline,
  chatbubbleEllipses,
  chatbubbleOutline,
  thumbsUpOutline,
  thumbsUp,
  playCircleOutline,
  closeOutline,
  removeOutline,
  addOutline,
  checkmarkCircle,
  arrowForwardOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { SupabaseService, RecipeItem, SauceComment, getSauceCategoryLabel } from '../../services/supabase.service';

@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.css']
})
export class RecipeDetailPage implements OnInit {
  id = '';
  isFavorite = false;
  isSauceLiked = false;
  recipe: RecipeItem | null = null;
  loading = true;
  sauceComments: SauceComment[] = [];
  newComment = '';
  savingComment = false;
  backHref = '/tabs/tab1';

  targetServings = 4;
  cookingSauce: RecipeItem | null = null;

  isCookingModeActive = false;
  activeVideoIndex = 0;
  detailVideoIndex = 0;
  viewIncremented = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({
      timeOutline,
      flameOutline,
      peopleOutline,
      heart,
      heartOutline,
      eyeOutline,
      videocamOutline,
      downloadOutline,
      leafOutline,
      cartOutline,
      constructOutline,
      listOutline,
      restaurantOutline,
      chatbubbleEllipses,
      chatbubbleOutline,
      thumbsUpOutline,
      thumbsUp,
      playCircleOutline,
      closeOutline,
      removeOutline,
      addOutline,
      checkmarkCircle,
      arrowForwardOutline,
      arrowBackOutline
    });
  }

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.loading = true;

    try {
      if (this.id) {
        this.recipe = await SupabaseService.getRecipeById(this.id);
        if (this.recipe?.source === 'sauce') {
          this.backHref = '/tabs/tab3';
          this.isSauceLiked = await SupabaseService.isSauceLiked(this.recipe.id);
          this.sauceComments = await SupabaseService.getSauceComments(this.recipe.id);
        }
        if (this.recipe) {
          const favoriteKeys = await SupabaseService.getFavoriteKeys();
          this.isFavorite = favoriteKeys.includes(SupabaseService.getFavoriteKey(this.recipe));
        }
      }
    } catch (e) {
      console.error('Erreur de chargement', e);
    } finally {
      this.loading = false;
    }

    if (this.recipe) {
      this.targetServings = this.recipe.servings || this.recipe.base_servings || 4;
    }
  }

  /** Sauce active en mode cuisson (sélectionnée à l'étape 2) */
  get activeSauce(): RecipeItem | null {
    return this.cookingSauce || this.recipe;
  }

  getVideoUrls(): string[] {
    return this.extractVideoUrls(this.activeSauce);
  }

  extractVideoUrls(item: RecipeItem | null): string[] {
    const url = item?.video_url;
    if (!url) return [];
    if (url.startsWith('[')) {
      try {
        const parsed = JSON.parse(url);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [url];
      } catch {
        return [url];
      }
    }
    return [url];
  }

  get activeVideoUrl(): string {
    const urls = this.getVideoUrls();
    return urls[this.activeVideoIndex] || '';
  }

  get detailVideoUrl(): string {
    const urls = this.extractVideoUrls(this.recipe);
    return urls[this.detailVideoIndex] || '';
  }

  getUtensilsList(): string[] {
    const utensils = this.activeSauce?.utensils;
    if (!Array.isArray(utensils)) return [];
    return utensils
      .map(u => (typeof u === 'string' ? u : u?.name || ''))
      .filter(Boolean);
  }

  async toggleFavorite() {
    if (!this.recipe) return;

    try {
      this.isFavorite = await SupabaseService.toggleFavorite(this.recipe);
      await this.showToast(
        this.isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris',
        'success'
      );
    } catch (e: any) {
      await this.showToast(e.message || 'Action impossible', 'warning');
    }
  }

  async toggleSauceLike() {
    if (!this.recipe || this.recipe.source !== 'sauce') return;

    try {
      const result = await SupabaseService.toggleSauceLike(this.recipe);
      this.isSauceLiked = result.liked;
      this.recipe.likes = result.likes;
    } catch (e: any) {
      await this.showToast(e.message || 'Connectez-vous pour liker cette sauce.', 'warning');
    }
  }

  async submitComment() {
    if (!this.recipe || this.recipe.source !== 'sauce') return;
    const content = this.newComment.trim();
    if (!content) {
      await this.showToast('Écrivez un commentaire avant de publier.', 'warning');
      return;
    }

    this.savingComment = true;
    try {
      const comment = await SupabaseService.addSauceComment(this.recipe.id, content);
      this.sauceComments = [comment, ...this.sauceComments];
      this.newComment = '';
      await this.showToast('Commentaire publié', 'success');
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de publier le commentaire', 'danger');
    } finally {
      this.savingComment = false;
    }
  }

  orderIngredients() {
    if (!this.recipe?.ingredients?.length) {
      this.showToast('Aucun ingrédient disponible pour cette sauce.', 'warning');
      return;
    }
    this.router.navigate(['/commandes'], {
      queryParams: { recipeId: this.id, recipeName: this.recipe?.title }
    });
  }

  scrollToComments() {
    document.getElementById('sauce-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  getCommentAuthorInitial(name?: string | null): string {
    return (name || 'U').charAt(0).toUpperCase();
  }

  formatCommentDate(createdAt: string): string {
    const date = new Date(createdAt);
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    return days === 1 ? 'Hier' : `Il y a ${days} j`;
  }

  startCookingMode() {
    this.activeVideoIndex = 0;
    this.isCookingModeActive = true;
  }

  endCookingMode() {
    this.isCookingModeActive = false;
  }

  selectVideo(index: number) {
    this.activeVideoIndex = index;
  }

  selectDetailVideo(index: number) {
    this.detailVideoIndex = index;
  }

  async onVideoPlay() {
    if (!this.recipe) return;
    try {
      const views = await SupabaseService.incrementViews(this.recipe);
      this.recipe.views = views;
      this.viewIncremented = true;
    } catch (e) {
      console.warn('View increment failed', e);
    }
  }

  downloadVideo() {
    const url = this.isCookingModeActive ? this.activeVideoUrl : this.detailVideoUrl;
    if (!url) {
      this.showToast('Aucune vidéo à télécharger.', 'warning');
      return;
    }
    const title = (this.recipe?.title || 'video').replace(/[^\w\-]+/g, '_');
    SupabaseService.downloadVideo(url, `${title}.mp4`);
    this.showToast('Téléchargement lancé', 'success');
  }

  getCategoryLabel(categoryId: string | null | undefined): string {
    return getSauceCategoryLabel(categoryId);
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
