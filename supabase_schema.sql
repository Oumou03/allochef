-- SCHEMA SQL POUR ALLOCHEF - CONFIGURATION SUPABASE
-- Vous pouvez exécuter ce script directement dans le SQL Editor de votre projet Supabase.

-- ==========================================
-- 1. DESACTIVATION / NETTOYAGE (Si existantes)
-- ==========================================
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS sauce_comments CASCADE;
DROP TABLE IF EXISTS sauce_likes CASCADE;
DROP TABLE IF EXISTS recipe_favorites CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS sauces CASCADE;
DROP TABLE IF EXISTS chefs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- 2. CRÉATION DES TABLES
-- ==========================================

-- Table : users (Liée à auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'chef', 'admin')),
    is_admin BOOLEAN DEFAULT false,
    favorites_count INTEGER DEFAULT 0,
    cooking_level TEXT DEFAULT 'Débutant',
    followed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow logged-in read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow logged-in update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow logged-in insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);


-- Déclencheur (Trigger) pour créer automatiquement un utilisateur public lors de l'inscription via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'user');
  INSERT INTO public.users (id, email, name, bio, role, is_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    new.raw_user_meta_data->>'bio',
    user_role,
    user_role = 'admin'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Table : orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    recipe_name TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending', -- pending, confirmed, preparing, delivered
    total NUMERIC NOT NULL,
    item_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : order_items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. CRÉATION DES TABLES
-- ==========================================

-- Table : chefs (liée aux comptes auth via user_id)
CREATE TABLE chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    followers INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view chefs" ON public.chefs FOR SELECT USING (true);
CREATE POLICY "Chefs can insert own profile" ON public.chefs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Chefs can update own profile" ON public.chefs FOR UPDATE USING (auth.uid() = user_id);

-- Table : recipes (Recettes de plats et TikTok Reels)
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    image_url TEXT,
    difficulty TEXT DEFAULT 'Facile',
    duration INTEGER DEFAULT 30, -- en minutes
    chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    base_servings INTEGER DEFAULT 2,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {name, quantity, unit}
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de textes ['étape 1', 'étape 2']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : sauces (Spécialité "Mes Sauces")
CREATE TABLE sauces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    video_url TEXT,
    image_url TEXT,
    duration INTEGER DEFAULT 15, -- en minutes
    difficulty TEXT DEFAULT 'Très Facile',
    description TEXT,
    ingredients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {name, quantity, unit}
    steps JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de textes ['étape 1', 'étape 2']
    compatible_dishes JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de plats ['Poulet braisé', 'Alloco']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : comments (Commentaires sur les recettes)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    content TEXT NOT NULL,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : recipe_favorites (Favoris des utilisateurs pour recettes/sauces)
CREATE TABLE recipe_favorites (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('recipe', 'sauce')),
    item_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, item_type, item_id)
);

-- Table : sauce_likes (Likes sur les sauces)
CREATE TABLE sauce_likes (
    sauce_id UUID NOT NULL REFERENCES sauces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (sauce_id, user_id)
);

-- Table : sauce_comments (Commentaires sur les sauces)
CREATE TABLE sauce_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sauce_id UUID NOT NULL REFERENCES sauces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : notifications (Notifications utilisateurs)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table : favorites (Liaison Recettes Favoris - Utilisateurs)
CREATE TABLE favorites (
    user_id UUID NOT NULL, -- Lié à auth.users de Supabase
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, recipe_id)
);

-- Table : follows (Suivis des Chefs - Utilisateurs)
CREATE TABLE follows (
    user_id UUID NOT NULL, -- Lié à auth.users de Supabase
    chef_id UUID REFERENCES chefs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, chef_id)
);

