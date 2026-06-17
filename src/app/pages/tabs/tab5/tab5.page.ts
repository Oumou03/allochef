import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  personOutline,
  moonOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  logOutOutline,
  logInOutline,
  star,
  createOutline,
  closeOutline,
  sparkles,
  restaurantOutline,
  videocamOutline,
  imageOutline,
  addCircleOutline,
  bookOutline,
  timeOutline,
  flameOutline,
  trashOutline,
  eyeOutline,
  heart
} from 'ionicons/icons';
import { SupabaseService, RecipeIngredient, RecipeItem, SauceComment, SAUCE_CATEGORIES, getSauceCategoryLabel, normalizeSauceCategory } from '../../../services/supabase.service';

interface SauceDraft {
  title: string;
  category: string;
  image_url: string;
  videosText: string;
  duration: number;
  utensilsText: string;
  ingredientsText: string;
  stepsText: string;
}

@Component({
  selector: 'app-tab5',
  templateUrl: 'tab5.page.html',
  styleUrls: ['tab5.page.css']
})
export class Tab5Page implements OnInit {
  isLoggedIn = false;
  loadingProfile = true;
  savingProfile = false;
  role = 'user';
  showEditModal = false;
  showRecipeModal = false;
  showSauceModal = false;
  darkMode = false;

  followedCount = 0;
  cookingLevel = 'Débutant';
  chefSpecialty = '';

  currentUser = {
    name: 'Utilisateur',
    avatar: '',
    email: '',
    bio: ''
  };

  showSaucesListModal = false;
  loadingSaucesList = false;
  expandedCommentsSauceId: string | null = null;
  private profileLoadedAt = 0;
  sauces: RecipeItem[] = [];
  sauceCommentsById: Record<string, SauceComment[]> = {};
  sauceStatsById: Record<string, { views: number; likes: number; favorites: number }> = {};
  replyDrafts: Record<string, string> = {};
  savingReplyId: string | null = null;
  editingSauceId: string | null = null;
  recipeAddedToSauce = false;
  selectedSauceImageFile?: File;
  selectedSauceVideoFiles: File[] = [];
  sauceImagePreviewUrl?: string;
  existingVideoUrls: string[] = [];
  uploadingSauceMedia = false;

  sauceCategories = SAUCE_CATEGORIES;

  newSauce: SauceDraft = this.emptySauceDraft();

  newRecipe = {
    duration: 30,
    utensilsText: '',
    ingredientsText: '',
    stepsText: ''
  };

  selectedAvatarFile?: File;
  avatarPreviewUrl?: string;

  constructor(private router: Router, private toastController: ToastController) {
    addIcons({
      personOutline,
      moonOutline,
      notificationsOutline,
      shieldCheckmarkOutline,
      logOutOutline,
      logInOutline,
      star,
      createOutline,
      closeOutline,
      sparkles,
      restaurantOutline,
      videocamOutline,
      imageOutline,
      addCircleOutline,
      bookOutline,
      timeOutline,
      flameOutline,
      trashOutline,
      eyeOutline,
      heart
    });
  }

  async ngOnInit() {
    await this.loadUserProfile(false);
  }

  ionViewWillEnter() {
    const stale = Date.now() - this.profileLoadedAt > 60_000;
    if (stale || !this.isLoggedIn) {
      this.loadUserProfile(false);
    }
  }

  private emptySauceDraft(): SauceDraft {
    return {
      title: '',
      category: 'feuilles',
      image_url: '',
      videosText: '',
      duration: 30,
      utensilsText: '',
      ingredientsText: '',
      stepsText: ''
    };
  }

  openSauceModal() {
    this.editingSauceId = null;
    this.newSauce = this.emptySauceDraft();
    this.recipeAddedToSauce = false;
    this.resetSauceMediaState();
    this.showSauceModal = true;
  }

  closeSauceModal() {
    this.showSauceModal = false;
    this.editingSauceId = null;
    this.newSauce = this.emptySauceDraft();
    this.recipeAddedToSauce = false;
    this.resetSauceMediaState();
  }

  private resetSauceMediaState() {
    this.selectedSauceImageFile = undefined;
    this.selectedSauceVideoFiles = [];
    this.sauceImagePreviewUrl = undefined;
    this.existingVideoUrls = [];
  }

  async openSauceListModal() {
    this.showSaucesListModal = true;
    this.loadingSaucesList = true;
    this.expandedCommentsSauceId = null;
    try {
      await this.refreshSauces(false);
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger vos sauces', 'danger');
    } finally {
      this.loadingSaucesList = false;
    }
  }

  closeSaucesListModal() {
    this.showSaucesListModal = false;
    this.expandedCommentsSauceId = null;
  }

  private async refreshSauces(loadComments = false) {
    const session = await SupabaseService.getSession();
    if (!session?.user?.id) {
      this.sauces = [];
      return;
    }

    this.sauces = await SupabaseService.getSaucesByChef(session.user.id);
    this.sauceCommentsById = {};
    this.sauceStatsById = {};

    if (!loadComments || !this.sauces.length) {
      return;
    }

    const feedback = await SupabaseService.getSauceFeedbackForChef(session.user.id);
    feedback.forEach(item => {
      this.sauceCommentsById[item.sauceId] = item.comments;
      this.sauceStatsById[item.sauceId] = {
        views: item.views,
        likes: item.likes,
        favorites: item.favorites
      };
    });
  }

  async toggleSauceComments(sauceId: string, event: Event) {
    event.stopPropagation();
    if (this.expandedCommentsSauceId === sauceId) {
      this.expandedCommentsSauceId = null;
      return;
    }

    this.expandedCommentsSauceId = sauceId;
    if (this.sauceCommentsById[sauceId]) return;

    try {
      this.sauceCommentsById[sauceId] = await SupabaseService.getSauceComments(sauceId);
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de charger les commentaires', 'danger');
    }
  }

  private parseVideoUrls(videoUrl: string | null | undefined): string[] {
    if (!videoUrl) return [];
    if (videoUrl.startsWith('[')) {
      try {
        const parsed = JSON.parse(videoUrl);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [videoUrl];
      } catch {
        return [videoUrl];
      }
    }
    return [videoUrl];
  }

  private serializeVideoUrls(urls: string[]): string | null {
    const clean = urls.map(url => url.trim()).filter(Boolean);
    if (!clean.length) return null;
    if (clean.length === 1) return clean[0];
    return JSON.stringify(clean);
  }

  private deserializeVideos(videoUrl: string | null | undefined): string {
    return this.parseVideoUrls(videoUrl).join('\n');
  }

  private ingredientsToText(ingredients: RecipeIngredient[]): string {
    return ingredients
      .map(i => {
        if (i.quantity != null && i.unit) {
          return `${i.name} | ${i.quantity} | ${i.unit}`;
        }
        return i.name;
      })
      .join('\n');
  }

  private parseIngredients(text: string): RecipeIngredient[] {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          const quantity = Number(parts[1]);
          return {
            name: parts[0],
            quantity: Number.isNaN(quantity) ? parts[1] : quantity,
            unit: parts[2]
          };
        }
        return { name: line };
      });
  }

  private parseLines(text: string): string[] {
    return text.split('\n').map(line => line.trim()).filter(Boolean);
  }

  private parseUtensils(text: string): { name: string }[] {
    return this.parseLines(text).map(name => ({ name }));
  }

  private utensilsToText(utensils: unknown): string {
    if (!Array.isArray(utensils)) return '';
    return utensils
      .map(u => (typeof u === 'string' ? u : (u as { name?: string })?.name || ''))
      .filter(Boolean)
      .join('\n');
  }

  editSauce(sauce: RecipeItem, event?: Event) {
    event?.stopPropagation();
    this.editingSauceId = sauce.id;
    this.newSauce = {
      title: sauce.title || '',
      category: normalizeSauceCategory(sauce.category),
      image_url: sauce.image_url || '',
      videosText: this.deserializeVideos(sauce.video_url),
      duration: sauce.duration ?? 30,
      utensilsText: this.utensilsToText(sauce.utensils),
      ingredientsText: this.ingredientsToText(sauce.ingredients || []),
      stepsText: (sauce.steps || []).join('\n')
    };
    this.recipeAddedToSauce = this.getDraftIngredientCount() > 0 && this.getDraftStepCount() > 0;
    this.selectedSauceImageFile = undefined;
    this.selectedSauceVideoFiles = [];
    this.sauceImagePreviewUrl = sauce.image_url || undefined;
    this.existingVideoUrls = this.parseVideoUrls(sauce.video_url);
    this.showSauceModal = true;
    this.closeSaucesListModal();
  }

  onSauceImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Veuillez sélectionner une image.', 'warning');
      return;
    }
    this.selectedSauceImageFile = file;
    const reader = new FileReader();
    reader.onload = e => (this.sauceImagePreviewUrl = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  onSauceVideosSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;

    const invalid = files.find(file => !file.type.startsWith('video/'));
    if (invalid) {
      this.showToast('Veuillez sélectionner uniquement des fichiers vidéo.', 'warning');
      return;
    }

    this.selectedSauceVideoFiles = [...this.selectedSauceVideoFiles, ...files];
    input.value = '';
  }

  removePendingVideo(index: number) {
    this.selectedSauceVideoFiles = this.selectedSauceVideoFiles.filter((_, i) => i !== index);
  }

  removeExistingVideo(index: number) {
    this.existingVideoUrls = this.existingVideoUrls.filter((_, i) => i !== index);
  }

  getPendingVideoCount(): number {
    return this.selectedSauceVideoFiles.length;
  }

  getExistingVideoCount(): number {
    return this.existingVideoUrls.length;
  }

  private async buildSauceMediaPayload(): Promise<{ image_url: string | null; video_url: string | null }> {
    const session = await SupabaseService.getSession();
    if (!session?.user?.id) throw new Error('Connectez-vous pour publier une sauce.');

    let image_url = this.newSauce.image_url.trim() || null;
    if (this.selectedSauceImageFile) {
      image_url = await SupabaseService.uploadSauceMedia(session.user.id, this.selectedSauceImageFile, 'image');
    }

    const videoUrls = [...this.existingVideoUrls];
    for (const file of this.selectedSauceVideoFiles) {
      const url = await SupabaseService.uploadSauceMedia(session.user.id, file, 'video');
      videoUrls.push(url);
    }

    return {
      image_url,
      video_url: this.serializeVideoUrls(videoUrls)
    };
  }

  async deleteSauce(sauceId: string, event?: Event) {
    event?.stopPropagation();
    if (!confirm('Supprimer cette sauce ?')) return;

    try {
      await SupabaseService.deleteSauce(sauceId);
      await this.refreshSauces(false);
      await this.showToast('Sauce supprimée', 'success');
    } catch (e: any) {
      await this.showToast(e.message || 'Erreur lors de la suppression', 'danger');
    }
  }

  async loadUserProfile(refreshSaucesOnLoad = false) {
    this.loadingProfile = true;
    try {
      const session = await SupabaseService.getSession();
      if (!session) {
        this.isLoggedIn = false;
        return;
      }
      const user = session.user;
      this.isLoggedIn = true;
      this.currentUser.email = user.email || '';
      const profile = await SupabaseService.ensureUserProfile(user);
      this.applyProfile(profile);
      if (this.role === 'admin') {
        this.router.navigate(['/admin/users'], { replaceUrl: true });
        return;
      }
      if (profile.role === 'chef' || profile.is_admin) {
        const chef = await SupabaseService.getChefByUserId(user.id);
        if (chef) {
          this.chefSpecialty = chef.specialty;
          if (chef.bio && !this.currentUser.bio) {
            this.currentUser.bio = chef.bio;
          }
        }
        if (refreshSaucesOnLoad) {
          await this.refreshSauces(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      this.isLoggedIn = false;
      await this.showToast(err.message || 'Impossible de charger le profil', 'danger');
    } finally {
      this.loadingProfile = false;
      this.profileLoadedAt = Date.now();
    }
  }

  private applyProfile(profile: {
    name: string;
    avatar: string | null;
    bio?: string | null;
    role?: string;
    is_admin: boolean;
    favorites_count?: number;
    followed_count?: number;
    cooking_level?: string;
  }) {
    this.currentUser.name = profile.name || 'Utilisateur';
    this.currentUser.avatar = SupabaseService.resolveAvatarUrl(profile.avatar, profile.name);
    this.currentUser.bio = profile.bio || '';
    this.role = SupabaseService.resolveRole(profile as any);
    this.followedCount = profile.followed_count ?? 0;
    this.cookingLevel = profile.cooking_level ?? 'Débutant';
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  goToRegister() {
    this.router.navigate(['/auth/register']);
  }

  goToNotifications() {
    this.router.navigate(['/notifications']);
  }

  handleDarkModeToggle(event: any) {
    this.darkMode = event.detail.checked;
    document.body.classList.toggle('dark', this.darkMode);
  }

  async logout() {
    await SupabaseService.signOut();
    this.isLoggedIn = false;
    this.currentUser = { name: 'Utilisateur', avatar: '', email: '', bio: '' };
    await this.showToast('Déconnexion réussie', 'success');
    this.router.navigate(['/auth/login']);
  }

  handleLogout() {
    this.logout();
  }

  openEditModal() {
    this.avatarPreviewUrl = undefined;
    this.selectedAvatarFile = undefined;
    this.showEditModal = true;
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Veuillez sélectionner une image.', 'warning');
      return;
    }
    this.selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = e => (this.avatarPreviewUrl = e.target?.result as string);
    reader.readAsDataURL(file);
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

  async saveProfile() {
    if (!this.currentUser.name?.trim()) {
      await this.showToast('Le nom ne peut pas être vide.', 'warning');
      return;
    }
    this.savingProfile = true;
    try {
      const session = await SupabaseService.getSession();
      if (!session) {
        await this.showToast('Session expirée. Reconnectez-vous.', 'warning');
        this.router.navigate(['/auth/login']);
        return;
      }
      const userId = session.user.id;
      let avatarUrl = this.currentUser.avatar;
      if (this.selectedAvatarFile) {
        avatarUrl = await SupabaseService.uploadAvatar(userId, this.selectedAvatarFile);
      }
      const updated = await SupabaseService.updateUser(userId, {
        name: this.currentUser.name.trim(),
        bio: this.currentUser.bio.trim() || null,
        avatar: avatarUrl.includes('ui-avatars.com') ? null : avatarUrl
      });
      this.applyProfile(updated);
      if (this.role === 'chef') {
        await SupabaseService.updateChef(userId, {
          name: this.currentUser.name.trim(),
          bio: this.currentUser.bio.trim() || null,
          avatar: updated.avatar
        });
      }
      this.showEditModal = false;
      this.selectedAvatarFile = undefined;
      this.avatarPreviewUrl = undefined;
      await this.showToast('Profil mis à jour !', 'success');
    } catch (err: any) {
      console.error('Erreur sauvegarde profil', err);
      await this.showToast(err.message || 'Erreur lors de la sauvegarde', 'danger');
    } finally {
      this.savingProfile = false;
    }
  }

  openRecipeModalFromSauce() {
    if (!this.newSauce.title.trim()) {
      this.showToast('Renseignez d\'abord le titre de la sauce', 'warning');
      return;
    }
    this.newRecipe = {
      duration: this.newSauce.duration,
      utensilsText: this.newSauce.utensilsText,
      ingredientsText: this.newSauce.ingredientsText,
      stepsText: this.newSauce.stepsText
    };
    this.showRecipeModal = true;
  }

  closeRecipeModal() {
    this.showRecipeModal = false;
    this.showSauceModal = true;
  }

  addRecipeToSauce() {
    if (!this.parseLines(this.newRecipe.ingredientsText).length) {
      return this.showToast('Ajoutez au moins un ingrédient', 'warning');
    }
    if (!this.parseLines(this.newRecipe.stepsText).length) {
      return this.showToast('Ajoutez au moins une étape de préparation', 'warning');
    }

    this.newSauce.duration = this.newRecipe.duration;
    this.newSauce.utensilsText = this.newRecipe.utensilsText;
    this.newSauce.ingredientsText = this.newRecipe.ingredientsText;
    this.newSauce.stepsText = this.newRecipe.stepsText;
    this.recipeAddedToSauce = true;

    this.showRecipeModal = false;
    this.showSauceModal = true;
    this.showToast(this.editingSauceId ? 'Recette mise à jour' : 'Recette ajoutée à la sauce', 'success');
  }

  async saveSauce() {
    if (!this.newSauce.title.trim()) {
      return this.showToast('Le titre est requis', 'warning');
    }
    if (!this.newSauce.category) {
      return this.showToast('Veuillez choisir une catégorie', 'warning');
    }
    if (!this.selectedSauceImageFile && !this.newSauce.image_url.trim()) {
      return this.showToast('Importez une photo de couverture', 'warning');
    }
    if (!this.getExistingVideoCount() && !this.getPendingVideoCount()) {
      return this.showToast('Importez au moins une vidéo', 'warning');
    }
    if (!this.recipeAddedToSauce && !this.parseLines(this.newSauce.ingredientsText).length) {
      return this.showToast('Ajoutez la recette avant de publier la sauce', 'warning');
    }
    if (!this.parseLines(this.newSauce.ingredientsText).length) {
      return this.showToast('Ajoutez au moins un ingrédient', 'warning');
    }
    if (!this.parseLines(this.newSauce.stepsText).length) {
      return this.showToast('Ajoutez au moins une étape de préparation', 'warning');
    }

    this.savingProfile = true;
    this.uploadingSauceMedia = true;
    const wasEditing = !!this.editingSauceId;
    try {
      const media = await this.buildSauceMediaPayload();
      const saucePayload = {
        title: this.newSauce.title.trim(),
        category: this.newSauce.category,
        image_url: media.image_url,
        video_url: media.video_url,
        duration: this.newSauce.duration,
        ingredients: this.parseIngredients(this.newSauce.ingredientsText),
        steps: this.parseLines(this.newSauce.stepsText),
        utensils: this.parseUtensils(this.newSauce.utensilsText)
      };

      if (this.editingSauceId) {
        await SupabaseService.updateSauce(this.editingSauceId, saucePayload);
        await this.showToast('Sauce mise à jour !', 'success');
      } else {
        await SupabaseService.addSauce(saucePayload);
        await this.showToast('Sauce ajoutée avec succès !', 'success');
      }

      await this.refreshSauces(false);
      this.closeSauceModal();
      if (wasEditing) {
        this.showSaucesListModal = true;
      }
    } catch (e: any) {
      await this.showToast(e.message || 'Erreur', 'danger');
    } finally {
      this.savingProfile = false;
      this.uploadingSauceMedia = false;
    }
  }

  getSauceVideoCount(sauce: RecipeItem): number {
    if (!sauce.video_url) return 0;
    if (sauce.video_url.startsWith('[')) {
      try {
        const parsed = JSON.parse(sauce.video_url);
        return Array.isArray(parsed) ? parsed.length : 1;
      } catch {
        return 1;
      }
    }
    return 1;
  }

  getDraftIngredientCount(): number {
    return this.parseLines(this.newSauce.ingredientsText).length;
  }

  getDraftStepCount(): number {
    return this.parseLines(this.newSauce.stepsText).length;
  }

  getCategoryLabel(categoryId: string | null | undefined): string {
    return getSauceCategoryLabel(categoryId);
  }

  getSauceComments(sauceId: string): SauceComment[] {
    return this.sauceCommentsById[sauceId] ?? [];
  }

  getSauceCommentCount(sauceId: string): number {
    return this.getSauceComments(sauceId).length;
  }

  getSauceViews(sauceId: string): number {
    return this.sauceStatsById[sauceId]?.views ?? this.sauces.find(s => s.id === sauceId)?.views ?? 0;
  }

  getSauceFavorites(sauceId: string): number {
    return this.sauceStatsById[sauceId]?.favorites ?? 0;
  }

  getSauceLikes(sauceId: string): number {
    return this.sauceStatsById[sauceId]?.likes ?? this.sauces.find(s => s.id === sauceId)?.likes ?? 0;
  }

  async submitChefReply(comment: SauceComment) {
    const draft = (this.replyDrafts[comment.id] || '').trim();
    if (!draft) {
      await this.showToast('Écrivez une réponse avant d\'envoyer.', 'warning');
      return;
    }

    this.savingReplyId = comment.id;
    try {
      const updated = await SupabaseService.replyToSauceComment(comment.id, draft);
      const comments = this.sauceCommentsById[comment.sauce_id] ?? [];
      this.sauceCommentsById[comment.sauce_id] = comments.map(c =>
        c.id === comment.id ? updated : c
      );
      this.replyDrafts[comment.id] = '';
      await this.showToast('Réponse publiée', 'success');
    } catch (e: any) {
      await this.showToast(e.message || 'Impossible de publier la réponse', 'danger');
    } finally {
      this.savingReplyId = null;
    }
  }

  goToAdmin() {
    this.router.navigate(['/admin/users']);
  }
}
