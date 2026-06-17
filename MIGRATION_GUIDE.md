# AlloCheF - Transformation React → Angular/Ionic

## 📱 Vue d'ensemble du projet

AlloCheF est une application mobile Ionic/Angular pour découvrir les meilleurs chefs et recettes. Le projet a été transformé d'une architecture React/Vite vers une architecture Angular moderne.

## 🏗️ Architecture du projet

### Structure des dossiers

```
src/
├── app/
│   ├── pages/
│   │   ├── tabs/                 # Composant principal avec navigation par tabs
│   │   │   ├── home/             # Tab 1: Accueil (recettes populaires)
│   │   │   ├── search/           # Tab 2: Recherche de recettes
│   │   │   ├── recipes/          # Tab 3: Recettes du jour
│   │   │   ├── favorites/        # Tab 4: Recettes favorites
│   │   │   └── profile/          # Tab 5: Profil utilisateur
│   │   ├── auth/                 # Pages d'authentification
│   │   │   ├── login/            # Connexion utilisateur
│   │   │   ├── register/         # Inscription utilisateur
│   │   │   ├── login-chef/       # Connexion chef
│   │   │   └── register-chef/    # Inscription chef
│   │   ├── splash/               # Écran de démarrage
│   │   └── onboarding/           # Guide d'introduction
│   ├── services/
│   │   └── supabase.service.ts   # Service Supabase réutilisable
│   ├── app.module.ts             # Module principal
│   ├── app-routing.module.ts     # Routing principal
│   ├── app.component.ts          # Composant racine
│   └── app.component.html        # Template racine
├── styles.css                    # Styles globaux
└── main.ts                       # Point d'entrée Angular
```

## 🔄 Navigation

```
splash/
  ↓ (3s)
onboarding/ (3 slides)
  ↓
auth/login
  ├→ register
  └→ login-chef → register-chef
  ↓
tabs/ (5 onglets)
  ├→ home (Tab 1)
  ├→ search (Tab 2)
  ├→ recipes (Tab 3)
  ├→ favorites (Tab 4)
  └→ profile (Tab 5)
```

## 🛠️ Changements clés de la transformation

### 1. Framework
- **React 19.0.0** → **Angular 18.2.0**
- **Vite** → **Angular CLI**
- **React Router** → **Angular Router**

### 2. Dépendances
- `@ionic/react` → `@ionic/angular`
- `@ionic/react-router` → Natif Angular Router
- Ajout de: `@angular/core`, `@angular/platform-browser`, `rxjs`, `zone.js`

### 3. Structure des modules
- **Lazy Loading**: Chaque page est un module à chargement différé
- **Routing**: Configuration hiérarchique avec routing enfant
- **Déclaration**: Migration vers syntax `standalone: false`

### 4. Configuration
- Nouveau `angular.json` pour la compilation
- Nouveau `tsconfig.json` pour Angular
- `ionic.config.json` mise à jour vers type: `"angular"`

## 📝 Pages principales

### Tabs (Navigation principale)
- **Home** (Tab 1): Feed de recettes populaires
- **Search** (Tab 2): Recherche avec filtres (difficulté, durée)
- **Recipes** (Tab 3): Recettes du jour avec grille
- **Favorites** (Tab 4): Recettes favoris de l'utilisateur
- **Profile** (Tab 5): Profil utilisateur, paramètres, déconnexion

### Authentification
- **Login**: Connexion utilisateur standard
- **Register**: Inscription nouvel utilisateur
- **Login Chef**: Connexion spéciale pour chefs
- **Register Chef**: Inscription chef avec nom restaurant

### Onboarding
- 3 slides d'introduction
- Navigation précédent/suivant
- Indicateurs de progression

## 🔧 Services

### SupabaseService
Service injectable pour gérer la communication avec Supabase:
```typescript
// Authentification
signUp(email, password)
signIn(email, password)
signOut()
getCurrentUser()

// Recettes
getRecipes()
getRecipeById(id)
searchRecipes(query)

// Favoris
getFavorites(userId)
addFavorite(userId, recipeId)
removeFavorite(userId, recipeId)

// Utilisateurs
getUserProfile(userId)
updateUserProfile(userId, profile)

// Chefs
getChefs()
getChefById(chefId)
```

## 🚀 Configuration Ionic

### Tabs Configuration
- Barre d'onglets en bas (`slot="bottom"`)
- 5 boutons d'onglets avec icônes
- Couleurs personnalisées: `--color` et `--color-selected`

### Icônes
Utilisées via `ionicons`:
- `homeOutline`, `home`
- `searchOutline`, `search`
- `flameOutline`, `flame`
- `heartOutline`, `heart`
- `personOutline`, `person`
- Nombreux autres icons Ionicons disponibles

## 🎨 Design

### Palette de couleurs
- **Primaire**: Gradient violet (`#667eea` → `#764ba2`)
- **Secondaire**: Gradient rose (`#f093fb` → `#f5576c`)
- **Accent**: Orange (`#ff9500`)

### Composants Ionic utilisés
- `ion-app`, `ion-header`, `ion-toolbar`, `ion-content`
- `ion-tabs`, `ion-tab-bar`, `ion-tab-button`
- `ion-button`, `ion-icon`, `ion-card`, `ion-item`
- `ion-input`, `ion-searchbar`, `ion-toggle`
- `ion-avatar`, `ion-grid`, `ion-row`, `ion-col`
- `ion-spinner`, `ion-label`, `ion-text`

## 📦 Installation et démarrage

### 1. Installer les dépendances
```bash
npm install
```

### 2. Démarrer le serveur de développement
```bash
npm start
# ou
ng serve
```

### 3. Builder pour la production
```bash
npm run build
# ou
ng build
```

### 4. Exécuter les tests
```bash
npm run test.unit
# ou
ng test
```

## 🔐 Configuration Supabase

Mettre à jour les variables dans `src/app/services/supabase.service.ts`:
```typescript
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';
```

## 📱 Capacitor (Mobile)

Le projet inclut Capacitor pour la compilation mobile:
```bash
npx cap add ios
npx cap add android
npx cap build ios
npx cap build android
```

## 🧪 Tests

- **E2E**: Cypress (dans `cypress/`)
- **Unitaires**: Jasmine/Karma (via `ng test`)
- Config Cypress dans `cypress.config.ts`

## 📄 Fichiers de configuration

- `angular.json` - Configuration Angular CLI
- `tsconfig.json` - Configuration TypeScript
- `ionic.config.json` - Configuration Ionic
- `capacitor.config.ts` - Configuration Capacitor
- `eslint.config.js` - Configuration ESLint
- `vite.config.ts` - (Hérité, non utilisé) 

## 🔍 Notes importantes

1. **Lazy Loading**: Tous les modules sont chargés à la demande pour optimiser les performances
2. **Routing**: Utilise le système de routing hiérarchique d'Angular
3. **Standalone**: Composants configurés avec `standalone: false` pour compatibilité NgModule
4. **Services**: Injectables au niveau root pour partage global
5. **CSS**: Styles globaux dans `styles.css`, styles de composant dans les fichiers `.css`

## 🚀 Prochaines étapes

1. Configurer Supabase avec les URLs et clés
2. Implémenter la logique d'authentification complète
3. Créer les services pour chaque page
4. Ajouter la gestion d'état (NgRx ou simple service)
5. Tester sur mobile via Capacitor
6. Publier sur App Store et Google Play
