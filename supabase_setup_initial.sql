-- ============================================================
-- ALLOCHEF — Configuration initiale Supabase (à exécuter EN PREMIER)
-- Projet : https://supabase.com/dashboard → SQL Editor → New query
-- Copiez-collez tout ce fichier et cliquez "Run"
-- ============================================================

-- 1. Table users (profils liés à auth.users)
CREATE TABLE IF NOT EXISTS public.users (
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
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Colonnes manquantes si la table users existait déjà (ancienne version)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cooking_level TEXT DEFAULT 'Débutant';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS followed_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.users SET role = 'user' WHERE role IS NULL;
UPDATE public.users SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'user');

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'chef', 'admin'));

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow logged-in read own profile') THEN
    CREATE POLICY "Allow logged-in read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow logged-in update own profile') THEN
    CREATE POLICY "Allow logged-in update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Allow logged-in insert own profile') THEN
    CREATE POLICY "Allow logged-in insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 2. Trigger : crée automatiquement le profil à l'inscription
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Table chefs (profils professionnels liés aux comptes)
CREATE TABLE IF NOT EXISTS public.chefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL DEFAULT 'Cuisine générale',
    avatar TEXT,
    bio TEXT,
    followers INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Si la table chefs existait déjà sans user_id
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Public can view chefs') THEN
    CREATE POLICY "Public can view chefs" ON public.chefs FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Chefs can insert own profile') THEN
    CREATE POLICY "Chefs can insert own profile" ON public.chefs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Chefs can update own profile') THEN
    CREATE POLICY "Chefs can update own profile" ON public.chefs FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 4. Bucket avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Avatar images are publicly accessible') THEN
    CREATE POLICY "Avatar images are publicly accessible"
      ON storage.objects FOR SELECT USING (bucket_id = 'profile-avatars');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can upload own avatar') THEN
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Users can update own avatar') THEN
    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;

-- 5. Profils pour les utilisateurs auth déjà existants (sans ligne dans public.users)
INSERT INTO public.users (id, email, name, role, is_admin)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'role', 'user'),
  COALESCE(au.raw_user_meta_data->>'role', 'user') = 'admin'
FROM auth.users au
LEFT JOIN public.users u ON u.id = au.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;
