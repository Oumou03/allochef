import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  optionsOutline,
  flame,
  timeOutline,
  heart,
  heartOutline,
  closeCircle,
  filterOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.css']
})
export class Tab2Page implements OnInit {
  query = '';
  showFilters = false;
  selectedDifficulty: string | null = null;
  selectedDuration: number | null = null;
  favorites: string[] = [];
  recipes = [] as any[];
  loading = true;

  durationOptions = [
    { label: '⚡ Rapide (< 20 min)', value: 20 },
    { label: '🕒 Moyen (< 45 min)', value: 45 },
    { label: '👨‍🍳 Mijoté (< 90 min)', value: 90 }
  ];

  constructor(private router: Router) {
    addIcons({
      searchOutline, optionsOutline, flame, timeOutline, heart, 
      heartOutline, closeCircle, filterOutline
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      this.recipes = await SupabaseService.getRecipes();
    } catch (error) {
      console.error(error);
    } finally {
      this.loading = false;
    }
  }

  get filteredRecipes() {
    return this.recipes.filter(recipe => {
      const chefName = recipe.chef?.name || '';
      const queryLower = this.query.toLowerCase();
      
      const matchesQuery = 
        recipe.title.toLowerCase().includes(queryLower) ||
        recipe.description.toLowerCase().includes(queryLower) ||
        chefName.toLowerCase().includes(queryLower) ||
        (recipe.ingredients && recipe.ingredients.some((ing: any) => ing.name.toLowerCase().includes(queryLower)));

      const matchesDifficulty = this.selectedDifficulty ? recipe.difficulty === this.selectedDifficulty : true;
      const matchesDuration = this.selectedDuration ? recipe.duration <= this.selectedDuration : true;

      return matchesQuery && matchesDifficulty && matchesDuration;
    });
  }

  onSearchInput(event: any) {
    this.query = event.target.value;
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  selectDifficulty(level: string) {
    this.selectedDifficulty = this.selectedDifficulty === level ? null : level;
  }

  selectDuration(value: number) {
    this.selectedDuration = this.selectedDuration === value ? null : value;
  }

  handleClearFilters() {
    this.selectedDifficulty = null;
    this.selectedDuration = null;
    this.query = '';
  }

  toggleFavorite(recipeId: string, event: Event) {
    event.stopPropagation();
    if (this.favorites.includes(recipeId)) {
      this.favorites = this.favorites.filter(id => id !== recipeId);
    } else {
      this.favorites.push(recipeId);
    }
  }

  goToRecipe(id: string, source?: string) {
    const path = source === 'sauce' ? '/sauce' : '/recipe';
    this.router.navigate([path, id]);
  }
}
