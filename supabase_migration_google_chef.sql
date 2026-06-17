-- Migration : Google OAuth + Comptes Chef liés à Supabase
-- Exécutez ce script dans le SQL Editor de Supabase.

-- 1. Colonne role sur users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
UPDATE public.users SET role = 'admin' WHERE is_admin = true AND (role IS NULL OR role = 'user');
UPDATE public.users SET role = 'user' WHERE role IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'chef', 'admin'));

-- 2. Lier chefs aux comptes utilisateurs
ALTER TABLE public.chefs ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Trigger inscription mis à jour (role + bio depuis metadata)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS sur la table chefs
ALTER TABLE public.chefs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Public can view chefs'
  ) THEN
    CREATE POLICY "Public can view chefs" ON public.chefs FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Chefs can insert own profile'
  ) THEN
    CREATE POLICY "Chefs can insert own profile"
      ON public.chefs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chefs' AND policyname = 'Chefs can update own profile'
  ) THEN
    CREATE POLICY "Chefs can update own profile"
      ON public.chefs FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
