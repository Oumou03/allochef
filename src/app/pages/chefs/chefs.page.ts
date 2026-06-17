import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { ChefProfile, SupabaseService } from '../../services/supabase.service';
import { peopleOutline, checkmarkCircleSharp, flame } from 'ionicons/icons';

interface ChefWithStats extends ChefProfile {
  sauceCount?: number;
  scorePopularity?: number;
}

@Component({
  selector: 'app-chefs',
  templateUrl: './chefs.page.html',
  styleUrls: ['./chefs.page.css']
})
export class ChefsPage implements OnInit {
  chefs: ChefWithStats[] = [];
  loading = true;
  sortBy: 'followers' | 'sauces' | 'name' = 'followers';

  constructor(private router: Router) {
    addIcons({ peopleOutline, checkmarkCircleSharp, flame });
  }

  ngOnInit() {
    this.loadChefs();
  }

  async loadChefs() {
    this.loading = true;
    try {
      const allChefs = await SupabaseService.getChefs();
      const allSauces = await SupabaseService.getSauces();

      this.chefs = allChefs.map(chef => {
        const sauceCount = allSauces.filter(sauce => sauce.chef?.name === chef.name).length;
        const scorePopularity = (chef.followers ?? 0) + (sauceCount * 5);
        return {
          ...chef,
          sauceCount,
          scorePopularity
        };
      });

      this.sortChefs();
    } catch (error) {
      console.error('Erreur de chargement des chefs:', error);
    } finally {
      this.loading = false;
    }
  }

  sortChefs() {
    if (this.sortBy === 'followers') {
      this.chefs.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
    } else if (this.sortBy === 'sauces') {
      this.chefs.sort((a, b) => (b.sauceCount ?? 0) - (a.sauceCount ?? 0));
    } else if (this.sortBy === 'name') {
      this.chefs.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  setSortBy(sortType: 'followers' | 'sauces' | 'name') {
    this.sortBy = sortType;
    this.sortChefs();
  }

  goToChef(id: string) {
    this.router.navigate(['/chef', id]);
  }
}
