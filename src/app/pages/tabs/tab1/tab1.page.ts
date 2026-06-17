import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { ToastController } from '@ionic/angular';
import { 
  notificationsOutline, flame, timeOutline, star, peopleOutline, 
  checkmarkCircleSharp, playCircle, heart, heartOutline, sparkles, 
  chatbubbleEllipses, closeOutline 
} from 'ionicons/icons';
import { ChefProfile, RecipeItem, SAUCE_CATEGORIES, SupabaseService, UserProfile } from '../../../services/supabase.service';

interface GuineanSauceSuggestion {
  keywords: string[];
  title: string;
  description: string;
  duration: number;
  difficulty: string;
  nutritionScore: string;
  expertReview: string;
  ingredients: string[];
}

const GUINEAN_SAUCE_CATALOG: GuineanSauceSuggestion[] = [
  {
    keywords: ['yassa', 'poulet', 'oignon', 'citron', 'moutarde'],
    title: 'Sauce Yassa Guinéenne',
    description: 'Sauce emblématique à base d\'oignons caramélisés, citron vert et moutarde — incontournable de la cuisine guinéenne.',
    duration: 25,
    difficulty: 'Moyen',
    nutritionScore: '9.2/10',
    expertReview: 'L\'IA conseille : cette sauce acidulée et fondante sublime le poisson braisé, le poulet grillé ou le riz blanc. Laissez mijoter les oignons pour libérer toute leur douceur.',
    ingredients: [
      '6 Gros oignons blancs émincés',
      '4 Citrons verts pressés',
      '2 Cuillères de moutarde forte',
      '3 Gousses d\'ail pilées',
      'Huile de palme ou arachide'
    ]
  },
  {
    keywords: ['arachide', 'mafe', 'mafé', 'cacahuete', 'cacahuète', 'viande'],
    title: 'Sauce Mafé à l\'Arachide Pure',
    description: 'Sauce onctueuse guinéenne à la pâte d\'arachide torréfiée, tomates fraîches et épices douces.',
    duration: 40,
    difficulty: 'Moyen',
    nutritionScore: '8.9/10',
    expertReview: 'L\'IA conseille : remuez la pâte d\'arachide à feu doux pour éviter les grumeaux. Parfaite avec du riz, du fonio ou des légumes racines.',
    ingredients: [
      '4 Cuillères à soupe de pâte d\'arachide pure',
      '3 Tomates fraîches mixées',
      '1 Oignon et 2 gousses d\'ail',
      'Cube de bouillon ou poisson fumé',
      'Piment doux et sel de Guinée'
    ]
  },
  {
    keywords: ['poisson', 'fumé', 'sardine', 'maquereau', 'crevette'],
    title: 'Sauce au Poisson Fumé Guinéenne',
    description: 'Sauce savoureuse à base de poisson fumé séché, tomates et piment doux — un classique des foyers guinéens.',
    duration: 30,
    difficulty: 'Facile',
    nutritionScore: '9.0/10',
    expertReview: 'L\'IA conseille : faites tremper le poisson fumé avant de l\'incorporer. Accompagne idéalement le riz au gras ou la patate bouillie.',
    ingredients: [
      '100g de poisson fumé séché (kofta ou sardine)',
      '4 Tomates bien mûres',
      '1 Gros oignon et ail',
      'Huile de palme rouge',
      'Piment doux guinéen et sel'
    ]
  },
  {
    keywords: ['feuille', 'feuilles', 'patate', 'kassa', 'sauce kassa'],
    title: 'Sauce Feuille de Patate Douce',
    description: 'Sauce traditionnelle guinéenne à base de feuilles de patate douce pilées, riche et nutritive.',
    duration: 45,
    difficulty: 'Intermédiaire',
    nutritionScore: '9.5/10',
    expertReview: 'L\'IA conseille : pilez les feuilles finement et laissez cuire longtemps avec un peu de bicarbonate pour adoucir. Servir avec du riz ou du fonio.',
    ingredients: [
      '500g de feuilles de patate douce fraîches',
      '200g de viande ou poisson fumé',
      '2 Cuillères d\'huile de palme',
      'Oignon, ail et cube d\'assaisonnement',
      'Piment doux et sel'
    ]
  },
  {
    keywords: ['gombo', 'kandia', 'okra'],
    title: 'Sauce Gombo (Kandia) Guinéenne',
    description: 'Sauce gluante et parfumée au gombo frais, typique des régions de Guinée forestière et maritime.',
    duration: 35,
    difficulty: 'Moyen',
    nutritionScore: '8.7/10',
    expertReview: 'L\'IA conseille : coupez le gombo en rondelles et faites-le revenir à feu vif pour préserver sa texture. Excellent avec le riz blanc.',
    ingredients: [
      '400g de gombo frais',
      '300g de viande ou poisson',
      '2 Tomates et 1 oignon',
      'Huile de palme',
      'Cube d\'assaisonnement et piment doux'
    ]
  },
  {
    keywords: ['avocat', 'crème', 'frais', 'froid'],
    title: 'Sauce Crémeuse à l\'Avocat Guinéen',
    description: 'Sauce froide onctueuse à l\'avocat mûr, citron vert de Coyah et coriandre fraîche.',
    duration: 15,
    difficulty: 'Facile',
    nutritionScore: '9.8/10',
    expertReview: 'L\'IA conseille : préparez-la juste avant de servir pour garder la couleur verte. Idéale avec poisson grillé ou brochettes.',
    ingredients: [
      '2 Avocats bien mûrs de Mamou',
      '1 Citron vert pressé',
      '1 Gousse d\'ail pressée',
      'Coriandre fraîche hachée',
      'Piment doux guinéen concassé'
    ]
  },
  {
    keywords: ['tomate', 'légume', 'legume', 'condiment', 'ail', 'oignon'],
    title: 'Sauce Tomate à l\'Ail Guinéenne',
    description: 'Sauce de base guinéenne aux tomates fraîches, ail et huile de palme — fondamentale de la cuisine locale.',
    duration: 20,
    difficulty: 'Facile',
    nutritionScore: '8.5/10',
    expertReview: 'L\'IA conseille : laissez réduire la sauce à feu moyen pour concentrer les saveurs. Base idéale pour riz au gras et plats en sauce.',
    ingredients: [
      '5 Tomates fraîches bien mûres',
      '4 Gousses d\'ail pilées',
      '1 Gros oignon émincé',
      '3 Cuillères d\'huile de palme',
      'Sel, piment doux et cube d\'assaisonnement'
    ]
  },
  {
    keywords: ['riz', 'gras', 'riz au gras'],
    title: 'Sauce pour Riz au Gras Guinéen',
    description: 'Sauce rouge parfumée à l\'huile de palme, tomates et épices — la compagne du riz au gras guinéen.',
    duration: 30,
    difficulty: 'Moyen',
    nutritionScore: '9.1/10',
    expertReview: 'L\'IA conseille : faites colorer la sauce avec l\'huile de palme rouge avant d\'ajouter le riz. Un plat de fête incontournable en Guinée.',
    ingredients: [
      '6 Tomates mixées',
      '1 Oignon, ail et piment doux',
      '4 Cuillères d\'huile de palme rouge',
      'Poisson fumé ou viande',
      'Cube d\'assaisonnement guinéen'
    ]
  }
];

const DEFAULT_QUICK_SAUCE_SUGGESTIONS = [
  'Sauce Yassa guinéenne',
  'Sauce Mafé arachide',
  'Sauce au poisson fumé',
  'Sauce Feuille de patate'
];

function normalizeCategoryKey(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('feuille')) return 'feuilles';
  if (lower.includes('arachide')) return 'arachide';
  if (lower.includes('légume') || lower.includes('legume') || lower.includes('condiment')) return 'legumes';
  if (lower.includes('riz')) return 'riz_au_gras';
  if (lower.includes('plat')) return 'plats';
  return lower;
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.css']
})
export class Tab1Page implements OnInit {
  searchTerm = '';
  favorites: string[] = [];
  recipes: RecipeItem[] = [];
  selectedCategory = 'toutes';
  culinaryCategories = [
    { id: 'toutes', label: 'Tout' },
    ...SAUCE_CATEGORIES.map(category => ({
      id: category.id,
      label: `${category.emoji} ${category.label}`
    }))
  ];
  chefs: ChefProfile[] = [];
  loading = true;
  userProfile: UserProfile | null = null;
  quickAiSuggestions: string[] = [...DEFAULT_QUICK_SAUCE_SUGGESTIONS];

  // AI Recommendation States
  showAiModal = false;
  aiInput = '';
  aiLoading = false;
  aiResult: any = null;

  constructor(
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({
      notificationsOutline, flame, timeOutline, star, peopleOutline, 
      checkmarkCircleSharp, playCircle, heart, heartOutline, sparkles, 
      chatbubbleEllipses, closeOutline
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      const [recipes, favorites, chefs] = await Promise.all([
        SupabaseService.getRecipes(),
        SupabaseService.getFavoriteKeys(),
        SupabaseService.getChefs()
      ]);
      this.recipes = recipes;
      this.favorites = favorites;
      this.chefs = chefs;

      const session = await SupabaseService.getSession();
      if (session?.user?.id) {
        this.userProfile = await SupabaseService.getUserProfile(session.user.id);
      } else {
        this.userProfile = null;
      }

      this.updateAiSuggestions();
    } catch (error) {
      console.error("Erreur de chargement des données:", error);
    } finally {
      this.loading = false;
    }
  }

  updateAiSuggestions() {
    const categoryToSauceLabel: Record<string, string> = {
      feuilles: 'Sauce Feuille de patate',
      arachide: 'Sauce Mafé arachide',
      legumes: 'Sauce tomate guinéenne',
      riz_au_gras: 'Sauce pour riz au gras',
      plats: 'Sauce au poisson fumé'
    };

    const favoriteItems = this.favorites.length
      ? this.recipes.filter(recipe => this.favorites.includes(SupabaseService.getFavoriteKey(recipe)))
      : [];

    const favoriteSauceLabels = Array.from(new Set(
      favoriteItems
        .map(recipe => recipe.category)
        .filter(Boolean)
        .map(category => categoryToSauceLabel[normalizeCategoryKey(category!)] ?? 'Sauce guinéenne du jour')
    )).slice(0, 2);

    const topCategories = this.recipes
      .filter(recipe => !!recipe.category)
      .reduce((acc: Record<string, number>, recipe) => {
        const category = recipe.category ?? 'Autre';
        acc[category] = (acc[category] ?? 0) + 1;
        return acc;
      }, {});

    const trendingSauceLabels = Object.entries(topCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([category]) => categoryToSauceLabel[normalizeCategoryKey(category)] ?? 'Sauce Yassa guinéenne');

    const suggestions = [...new Set([
      ...favoriteSauceLabels,
      ...trendingSauceLabels,
      ...DEFAULT_QUICK_SAUCE_SUGGESTIONS
    ])].slice(0, 4);

    this.quickAiSuggestions = suggestions;
  }

  private matchGuineanSauce(query: string): GuineanSauceSuggestion {
    const lower = query.toLowerCase();

    const categoryKeywordMap: Record<string, string[]> = {
      feuille: ['feuille', 'feuilles', 'patate', 'kassa'],
      arachide: ['arachide', 'mafe', 'mafé', 'cacahuete'],
      legume: ['légume', 'legume', 'tomate', 'condiment', 'ail'],
      riz: ['riz', 'gras'],
      poisson: ['poisson', 'fumé', 'sardine']
    };

    for (const sauce of GUINEAN_SAUCE_CATALOG) {
      if (sauce.keywords.some(keyword => lower.includes(keyword))) {
        return sauce;
      }
    }

    for (const [hint, keywords] of Object.entries(categoryKeywordMap)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        const match = GUINEAN_SAUCE_CATALOG.find(s => s.keywords.some(k => k.includes(hint) || hint.includes(k)));
        if (match) return match;
      }
    }

    const hash = [...lower].reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return GUINEAN_SAUCE_CATALOG[hash % GUINEAN_SAUCE_CATALOG.length];
  }

  onSearchInput(event: any) {
    this.searchTerm = event.detail?.value ?? event.target?.value ?? '';
  }

  get displayedRecipes() {
    const clean = this.searchTerm.trim().toLowerCase();
    return this.recipes.filter(recipe => {
      const matchesCategory = this.selectedCategory === 'toutes' || recipe.category === this.selectedCategory;
      if (!matchesCategory) return false;
      if (!clean) return true;

      const text = [
        recipe.title,
        recipe.description,
        recipe.category,
        recipe.chef?.name,
        ...recipe.ingredients.map(ingredient => ingredient.name)
      ].filter(Boolean).join(' ').toLowerCase();

      return text.includes(clean);
    });
  }

  setSelectedCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }

  navigateToSearch() {
    this.router.navigate(['/tabs/tab2']);
  }

  navigateToNotifications() {
    this.router.navigate(['/notifications']);
  }

  goToRecipe(id: string, source?: string) {
    const path = source === 'sauce' ? '/sauce' : '/recipe';
    this.router.navigate([path, id]);
  }

  navigateToChefs() {
    this.router.navigate(['/chefs']);
  }

  goToChef(id: string) {
    this.router.navigate(['/chef', id]);
  }

  async toggleFavorite(recipe: RecipeItem, event: Event) {
    event.stopPropagation();
    const isFavorite = await SupabaseService.toggleFavorite(recipe);
    const key = SupabaseService.getFavoriteKey(recipe);
    this.favorites = isFavorite
      ? [...new Set([...this.favorites, key])]
      : this.favorites.filter(id => id !== key);
  }

  getFavoriteKey(recipe: RecipeItem): string {
    return SupabaseService.getFavoriteKey(recipe);
  }

  requireAuthPremium() {
    // Logic for premium
  }

  handleGetAiRecommendation(presetQuery?: string) {
    const queryText = presetQuery || this.aiInput;
    if (!queryText.trim()) return;

    this.aiLoading = true;
    this.aiResult = null;
    this.showAiModal = true;

    setTimeout(() => {
      const sauce = this.matchGuineanSauce(queryText);
      this.aiResult = {
        title: sauce.title,
        description: sauce.description,
        duration: sauce.duration,
        difficulty: sauce.difficulty,
        nutritionScore: sauce.nutritionScore,
        expertReview: sauce.expertReview,
        ingredients: sauce.ingredients
      };
      this.aiLoading = false;
    }, 1800);
  }

  async saveAiSuggestion() {
    this.showAiModal = false;
    const toast = await this.toastController.create({
      message: "Suggestion enregistrée dans votre carnet de cuisine !",
      duration: 2000,
      color: "success"
    });
    toast.present();
  }
}

