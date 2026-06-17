-- ============================================================
-- ALLOCHEF — Correction table sauces (colonnes manquantes)
-- Exécuter dans Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Ajout des colonnes manquantes sur la table sauces
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS chef_id UUID REFERENCES public.chefs(id) ON DELETE SET NULL;
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS utensils JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected'));
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE public.sauces ADD COLUMN IF NOT EXISTS base_servings INTEGER DEFAULT 2;

-- 2. Activer RLS sur la table sauces (si pas encore fait)
ALTER TABLE public.sauces ENABLE ROW LEVEL SECURITY;

-- 3. Politiques RLS pour la table sauces
-- Lecture publique des sauces publiées
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sauces' AND policyname = 'Public can view published sauces') THEN
    CREATE POLICY "Public can view published sauces"
      ON public.sauces FOR SELECT
      USING (status = 'published' OR auth.uid() IS NOT NULL);
  END IF;

  -- Les chefs connectés peuvent insérer leurs propres sauces
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sauces' AND policyname = 'Chefs can insert sauces') THEN
    CREATE POLICY "Chefs can insert sauces"
      ON public.sauces FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  -- Les chefs peuvent modifier leurs propres sauces
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sauces' AND policyname = 'Chefs can update own sauces') THEN
    CREATE POLICY "Chefs can update own sauces"
      ON public.sauces FOR UPDATE
      TO authenticated
      USING (
        chef_id IN (
          SELECT id FROM public.chefs WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Les chefs peuvent supprimer leurs propres sauces
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sauces' AND policyname = 'Allow auth delete sauces') THEN
    CREATE POLICY "Allow auth delete sauces"
      ON public.sauces FOR DELETE
      TO authenticated
      USING (true);
  END IF;

  -- Les admins peuvent tout modifier
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sauces' AND policyname = 'Admins can manage all sauces') THEN
    CREATE POLICY "Admins can manage all sauces"
      ON public.sauces FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )
      );
  END IF;
END $$;

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sauces_chef_id ON public.sauces(chef_id);
CREATE INDEX IF NOT EXISTS idx_sauces_status ON public.sauces(status);

-- 5. Bucket sauce-media (si pas encore créé)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sauce-media', 'sauce-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Politiques storage pour sauce-media
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public read sauce media') THEN
    CREATE POLICY "Public read sauce media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'sauce-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Chef upload sauce media') THEN
    CREATE POLICY "Chef upload sauce media"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'sauce-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Chef update sauce media') THEN
    CREATE POLICY "Chef update sauce media"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'sauce-media');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Chef delete sauce media') THEN
    CREATE POLICY "Chef delete sauce media"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'sauce-media');
  END IF;
END $$;

-- 7. Vérification : afficher la structure de la table sauces
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sauces'
ORDER BY ordinal_position;
