import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  eyeOutline,
  heartOutline,
  restaurantOutline,
  timeOutline,
  peopleOutline,
  bookOutline,
  personAddOutline,
  personRemoveOutline,
  chatbubbleOutline,
  starOutline,
  closeOutline
} from 'ionicons/icons';
import {
  ChefProfile,
  RecipeItem,
  SupabaseService,
  getSauceCategoryLabel
} from '../../services/supabase.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-chef-detail',
  templateUrl: './chef-detail.page.html',
  styleUrls: ['./chef-detail.page.css']
})
export class ChefDetailPage implements OnInit {
  id = '';
  loading = true;
  chef: ChefProfile | null = null;
  sauces: RecipeItem[] = [];

  // Stats réelles
  totalViews = 0;
  totalLikes = 0;
  totalComments = 0;
  followersCount = 0;

  // Suivi
  isFollowingChef = false;
  loadingFollowState = false;

  // Session utilisateur courant
  currentUserId: string | null = null;
  isOwnProfile = false;   // true si le chef connecté consulte son propre profil

  // Liste des abonnés (visible pour le chef connecté seulement)
  showFollowersModal = false;
  followers: Array<{ id: string; name: string; avatar: string | null; email?: string }> = [];
  loadingFollowers = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({
      checkmarkCircle,
      eyeOutline,
      heartOutline,
      restaurantOutline,
      timeOutline,
      peopleOutline,
      bookOutline,
      personAddOutline,
      personRemoveOutline,
      chatbubbleOutline,
      starOutline,
      closeOutline
    });
  }

  async ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    await this.loadChefProfile();
  }

  async loadChefProfile() {
    if (!this.id) {
      this.loading = false;
      return;
    }

    this.loading = true;
    try {
      // Charger session utilisateur courant
      const session = await SupabaseService.getSession();
      this.currentUserId = session?.user?.id ?? null;

      // Charger profil chef
      this.chef = await SupabaseService.getChefById(this.id);
      if (!this.chef) {
        this.sauces = [];
        return;
      }

      // Vérifier si c'est le propre profil du chef connecté
      if (this.currentUserId && this.chef.user_id === this.currentUserId) {
        this.isOwnProfile = true;
      }

      // Charger en parallèle : sauces + stats + état de suivi
      const [sauces, stats] = await Promise.all([
        SupabaseService.getSaucesByChefId(this.id),
        SupabaseService.getChefPublicStats(this.id)
      ]);

      this.sauces = sauces;
      this.followersCount = stats.followers;
      this.totalViews = stats.totalViews;
      this.totalLikes = stats.totalLikes;
      this.totalComments = stats.totalComments;

      // Mettre à jour le compteur d'abonnés sur le profil chef local
      if (this.chef) {
        this.chef.followers = stats.followers;
      }

      // Vérifier si l'utilisateur connecté suit ce chef (sauf si c'est le propre profil)
      if (!this.isOwnProfile && this.currentUserId) {
        try {
          this.isFollowingChef = await SupabaseService.isChefFollowed(this.id);
        } catch (err) {
          console.warn('Impossible de charger l\'état de suivi du chef', err);
          this.isFollowingChef = false;
        }
      }
    } catch (error) {
      console.error('Erreur chargement profil chef', error);
      this.chef = null;
      this.sauces = [];
    } finally {
      this.loading = false;
    }
  }

  async toggleFollow(event: Event) {
    event.stopPropagation();
    if (!this.chef) return;
    if (!this.currentUserId) {
      await this.showToast('Connectez-vous pour suivre un chef.', 'warning');
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadingFollowState = true;
    try {
      const result = await SupabaseService.toggleFollowChef(this.id);
      this.isFollowingChef = result.isFollowing;
      this.followersCount = result.followers;
      if (this.chef) this.chef.followers = result.followers;
      await this.showToast(
        result.isFollowing ? 'Vous suivez maintenant ce chef.' : 'Vous ne suivez plus ce chef.',
        'success'
      );
    } catch (error: any) {
      await this.showToast(error?.message || 'Impossible de mettre à jour le suivi.', 'danger');
    } finally {
      this.loadingFollowState = false;
    }
  }

  /** Ouvrir la liste des abonnés (chef propriétaire uniquement) */
  async openFollowersModal(event: Event) {
    event.stopPropagation();
    this.showFollowersModal = true;
    this.loadingFollowers = true;
    try {
      this.followers = await SupabaseService.getChefFollowers(this.id);
    } catch (err: any) {
      await this.showToast(err?.message || 'Impossible de charger les abonnés.', 'danger');
    } finally {
      this.loadingFollowers = false;
    }
  }

  closeFollowersModal() {
    this.showFollowersModal = false;
    this.followers = [];
  }

  getCategoryLabel(categoryId: string | null | undefined): string {
    return getSauceCategoryLabel(categoryId);
  }

  getSauceStatusLabel(status: string | null | undefined): string {
    switch (status) {
      case 'published': return '';
      case 'pending': return '⏳ En attente';
      case 'rejected': return '❌ Rejeté';
      default: return '';
    }
  }

  openSauce(sauce: RecipeItem) {
    this.router.navigate(['/sauce', sauce.id]);
  }

  getMemberSinceLabel(date?: string): string {
    if (!date) return 'Membre AlloChef';
    return `Membre depuis ${new Date(date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
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
