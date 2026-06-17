-- Migration : Auth & Profil utilisateur
-- Exécutez ce script dans le SQL Editor de Supabase si votre base existe déjà.

-- 1. Colonne bio sur le profil utilisateur
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Politique INSERT (fallback si le trigger n'a pas créé le profil)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users' AND policyname = 'Allow logged-in insert own profile'
  ) THEN
    CREATE POLICY "Allow logged-in insert own profile"
      ON public.users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- 3. Bucket pour les avatars (public en lecture)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 4. Politiques Storage pour les avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Avatar images are publicly accessible'
  ) THEN
    CREATE POLICY "Avatar images are publicly accessible"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'profile-avatars');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can upload own avatar'
  ) THEN
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can update own avatar'
  ) THEN
    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND policyname = 'Users can delete own avatar'
  ) THEN
    CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'profile-avatars'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;
