-- ============================================================
-- CORRECTIF : créer la table public.users (manquante dans l'API)
-- Exécutez ce script ENTIER dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Créer la table users (si elle n'existe vraiment pas)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    favorites_count INTEGER DEFAULT 0,
    cooking_level TEXT DEFAULT 'Débutant',
    followed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Colonnes manquantes (si table partielle)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS favorites_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cooking_level TEXT DEFAULT 'Débutant';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS followed_count INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

UPDATE public.users SET role = 'user' WHERE role IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'chef', 'admin'));

-- 3. RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow logged-in read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow logged-in update own profile" ON public.users;
DROP POLICY IF EXISTS "Allow logged-in insert own profile" ON public.users;

CREATE POLICY "Allow logged-in read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Allow logged-in update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow logged-in insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Trigger inscription
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
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
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

-- 5. Lier chefs → users (si chefs existe déjà)
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'chefs_user_id_fkey' AND table_name = 'chefs'
  ) THEN
    ALTER TABLE public.chefs
      ADD CONSTRAINT chefs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Permissions API (PostgREST)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chefs TO anon, authenticated, service_role;

-- 7. Importer les comptes auth existants
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

-- 8. Recharger le cache API Supabase
NOTIFY pgrst, 'reload schema';
