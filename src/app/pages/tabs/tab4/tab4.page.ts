import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart, timeOutline, flame, playCircle } from 'ionicons/icons';
import { RecipeItem, SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-tab4',
  templateUrl: 'tab4.page.html',
  styleUrls: ['tab4.page.css']
})
export class Tab4Page implements OnInit {
  favoriteRecipes: RecipeItem[] = [];
  loading = true;

  constructor(private router: Router) {
    addIcons({
      heart, timeOutline, flame, playCircle
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      this.favoriteRecipes = await SupabaseService.getFavoriteItems();
    } catch (error) {
      console.error(error);
      this.favoriteRecipes = [];
    } finally {
      this.loading = false;
    }
  }

  async removeFavorite(recipe: RecipeItem, event: Event) {
    event.stopPropagation();
    try {
      await SupabaseService.toggleFavorite(recipe);
      this.favoriteRecipes = this.favoriteRecipes.filter(
        r => !(r.id === recipe.id && r.source === recipe.source)
      );
    } catch (error) {
      console.error(error);
    }
  }

  goToRecipe(id: string, source?: string) {
    const path = source === 'sauce' ? '/sauce' : '/recipe';
    this.router.navigate([path, id]);
  }

  getSecretSauceCount() {
    return this.favoriteRecipes.filter(r => r.source === 'sauce').length;
  }
}
