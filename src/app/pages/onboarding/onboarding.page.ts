import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowForward, checkmarkCircle } from 'ionicons/icons';
import { SupabaseService } from '../../services/supabase.service';

const LEVEL_MAP: Record<string, string> = {
  debutant: 'Débutant',
  intermediaire: 'Intermédiaire',
  expert: 'Expert'
};

@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.page.html',
  styleUrls: ['onboarding.page.css']
})
export class OnboardingPage {
  currentSlide = 0;
  cookingLevel = 'debutant';
  preferencesSaved = false;

  slides = [
    {
      icon: '',
      title: 'Devenez un Chef',
      subtitle: 'Apprenez à cuisiner les plus grands plats de la gastronomie moderne grâce à des vidéos interactives présentées par des chefs professionnels.',
    },
    {
      icon: '',
      title: 'Portions Intelligentes',
      subtitle: 'Plus besoin de calculer ! Notre algorithme adapte automatiquement les ingrédients selon le nombre de convives et votre profil culinaire.',
    },
    {
      icon: '',
      title: 'L\'Art des Sauces',
      subtitle: 'Accédez à l\'onglet premium "Mes Sauces" pour sublimer chaque plat avec des recettes secrètes, africaines et internationales.',
    }
  ];

  constructor(private router: Router) {
    addIcons({ arrowForward, checkmarkCircle });
  }

  handleNext() {
    if (this.currentSlide < this.slides.length - 1) {
      this.currentSlide++;
    } else {
      this.preferencesSaved = true;
    }
  }

  setPreferencesSaved(saved: boolean) {
    this.preferencesSaved = saved;
  }

  setCookingLevel(level: string) {
    this.cookingLevel = level;
  }

  async finishOnboarding() {
    localStorage.setItem('allochef_onboarding_completed', 'true');
    localStorage.setItem('allochef_user_level', this.cookingLevel);

    const mappedLevel = LEVEL_MAP[this.cookingLevel] || 'Débutant';

    try {
      const session = await SupabaseService.getSession();
      if (session?.user) {
        await SupabaseService.updateUser(session.user.id, {
          cooking_level: mappedLevel
        });
      }
    } catch (err) {
      console.error('Erreur sauvegarde niveau cuisine', err);
    }

    this.router.navigate(['/tabs/tab1'], { replaceUrl: true });
  }
}
