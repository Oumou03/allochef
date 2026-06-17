# 🚀 Démarrage rapide - AlloCheF (Angular/Ionic)

## ✅ Prérequis

- Node.js 18+ 
- npm ou yarn
- Compte Supabase
- Angular CLI (optionnel, npm run sert de proxy)

## 📦 Installation

```bash
# 1. Naviguer vers le dossier du projet
cd allochef

# 2. Installer les dépendances
npm install

# 3. Configurer Supabase (IMPORTANT)
# Éditer: src/environments/environment.ts
# Éditer: src/app/services/supabase.service.ts
# Ajouter vos URL et clés Supabase

# 4. Démarrer le serveur de développement
npm start
```

Le serveur sera disponible sur `http://localhost:4200`

## 📁 Structure du projet

```
allochef/
├── src/
│   ├── app/
│   │   ├── pages/
│   │   │   ├── tabs/            ← Navigation principale (5 tabs)
│   │   │   ├── auth/            ← Pages de connexion
│   │   │   ├── splash/          ← Écran de démarrage
│   │   │   └── onboarding/      ← Guide d'introduction
│   │   ├── services/            ← Services réutilisables
│   │   ├── app.module.ts        ← Module racine
│   │   └── app-routing.module.ts← Routing
│   ├── styles.css               ← Styles globaux
│   ├── main.ts                  ← Point d'entrée
│   └── index.html               ← Page HTML
├── angular.json                 ← Config Angular
├── ionic.config.json            ← Config Ionic
├── capacitor.config.ts          ← Config Capacitor
└── package.json                 ← Dépendances
```

## 🎯 Navigation principales

1. **Splash** → **Onboarding** → **Auth/Login** → **Tabs**
2. **Tabs** contient 5 onglets:
   - 🏠 **Home**: Recettes populaires
   - 🔍 **Search**: Recherche avec filtres
   - 🔥 **Recipes**: Recettes du jour
   - ❤️ **Favorites**: Favoris
   - 👤 **Profile**: Profil & paramètres

## 🔑 Variables d'environnement

Créer un fichier `.env` à la racine:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

Ou modifier directement:
- `src/environments/environment.ts` (développement)
- `src/environments/environment.prod.ts` (production)

## 🧪 Commandes disponibles

```bash
# Développement
npm start              # Démarrer le serveur (ng serve)
npm run build          # Builder le projet
npm run preview        # Prévisualiser la build
npm run lint           # Linter le code
npm run test.unit      # Tests unitaires
npm run test.e2e       # Tests E2E (Cypress)

# Mobile (Capacitor)
npx cap add ios        # Ajouter support iOS
npx cap add android    # Ajouter support Android
npx cap build ios      # Builder pour iOS
npx cap build android  # Builder pour Android
```

## 🔐 Configuration Supabase

1. Créer un projet sur [supabase.io](https://supabase.io)
2. Récupérer l'URL et la clé anon
3. Updater `src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     supabase: {
       url: 'votre-url',
       anonKey: 'votre-clé'
     }
   };
   ```

## 📱 Publier en tant qu'App mobile

```bash
# 1. Configurer Capacitor
npx cap init

# 2. Builder l'app
npm run build

# 3. Copier les fichiers dans Capacitor
npx cap copy

# 4. Ouvrir le projet mobile
npx cap open ios
# ou
npx cap open android

# 5. Builder et signer avec Xcode/Android Studio
```

## 🐛 Troubleshooting

### Erreur: "Cannot find module '@angular/core'"
```bash
npm install
```

### Erreur: "Module not found" pour Supabase
```bash
npm install @supabase/supabase-js
```

### Port 4200 déjà utilisé
```bash
ng serve --port 4201
```

### Capacitor ne reconnaît pas les fichiers
```bash
npm run build
npx cap copy
npx cap sync
```

## 📚 Documentation utile

- [Angular Documentation](https://angular.io/docs)
- [Ionic Documentation](https://ionicframework.com/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Ionicons](https://ionicons.com/)

## 🎨 Personnalisation

### Changer la couleur primaire
Modifier `src/app/pages/auth/login/login.page.css`:
```css
.auth-content {
  --background: linear-gradient(135deg, YOUR_COLOR1 0%, YOUR_COLOR2 100%);
}
```

### Ajouter une nouvelle page
```bash
# 1. Créer le dossier dans src/app/pages/
mkdir src/app/pages/my-page

# 2. Créer les fichiers:
# - my-page.module.ts
# - my-page-routing.module.ts
# - my-page.page.ts
# - my-page.page.html
# - my-page.page.css

# 3. Ajouter le routing dans app-routing.module.ts
```

## 🚀 Déployement

```bash
# Build production
npm run build

# Servir les fichiers dist/
# Par exemple avec Firebase Hosting:
firebase deploy
```

## ❓ Besoin d'aide?

Vérifier:
1. Les logs dans la console du navigateur (F12)
2. Les variables d'environnement Supabase
3. Les dépendances installées (`npm list`)
4. Les erreurs TypeScript (`npm run lint`)

Bonne chance! 🎉
