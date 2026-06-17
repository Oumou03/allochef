-- ============================================================
-- CORRECTION DES POLITIQUES RLS MANQUANTES
-- Tables : sauce_likes, recipe_favorites, sauce_comments, sauces
-- 
-- INSTRUCTIONS : Copiez et collez ce script dans le SQL Editor
-- de votre projet Supabase, puis cliquez sur "Run".
-- Ce script est idempotent (peut être relancé sans risque).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TABLE sauce_likes : Likes sur les sauces
-- ============================================================
ALTER TABLE public.sauce_likes ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les likes (pour compter)
DROP POLICY IF EXISTS "Anyone can view sauce likes" ON public.sauce_likes;
CREATE POLICY "Anyone can view sauce likes"
  ON public.sauce_likes
  FOR SELECT
  USING (true);

-- Un utilisateur connecté peut ajouter un like
DROP POLICY IF EXISTS "Authenticated users can insert sauce likes" ON public.sauce_likes;
CREATE POLICY "Authenticated users can insert sauce likes"
  ON public.sauce_likes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Un utilisateur connecté peut retirer son propre like
DROP POLICY IF EXISTS "Users can delete own sauce likes" ON public.sauce_likes;
CREATE POLICY "Users can delete own sauce likes"
  ON public.sauce_likes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 2. TABLE recipe_favorites : Favoris (recettes + sauces)
-- ============================================================
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;

-- Un utilisateur peut voir ses propres favoris
DROP POLICY IF EXISTS "Users can view own favorites" ON public.recipe_favorites;
CREATE POLICY "Users can view own favorites"
  ON public.recipe_favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Un utilisateur peut ajouter ses propres favoris
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.recipe_favorites;
CREATE POLICY "Users can insert own favorites"
  ON public.recipe_favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Un utilisateur peut retirer ses propres favoris
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.recipe_favorites;
CREATE POLICY "Users can delete own favorites"
  ON public.recipe_favorites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. TABLE sauce_comments : Commentaires sur les sauces
-- ============================================================
ALTER TABLE public.sauce_comments ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les commentaires
DROP POLICY IF EXISTS "Anyone can view sauce comments" ON public.sauce_comments;
CREATE POLICY "Anyone can view sauce comments"
  ON public.sauce_comments
  FOR SELECT
  USING (true);

-- Un utilisateur connecté peut ajouter un commentaire
DROP POLICY IF EXISTS "Authenticated users can insert sauce comments" ON public.sauce_comments;
CREATE POLICY "Authenticated users can insert sauce comments"
  ON public.sauce_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Un utilisateur peut supprimer ses propres commentaires
DROP POLICY IF EXISTS "Users can delete own sauce comments" ON public.sauce_comments;
CREATE POLICY "Users can delete own sauce comments"
  ON public.sauce_comments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Un utilisateur peut modifier ses propres commentaires
DROP POLICY IF EXISTS "Users can update own sauce comments" ON public.sauce_comments;
CREATE POLICY "Users can update own sauce comments"
  ON public.sauce_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 4. TABLE sauces : Lecture publique + mise à jour likes/views
-- ============================================================
ALTER TABLE public.sauces ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut voir les sauces
DROP POLICY IF EXISTS "Anyone can view sauces" ON public.sauces;
CREATE POLICY "Anyone can view sauces"
  ON public.sauces
  FOR SELECT
  USING (true);

-- Les utilisateurs connectés peuvent mettre à jour les compteurs (likes, views)
DROP POLICY IF EXISTS "Authenticated can update sauce counters" ON public.sauces;
CREATE POLICY "Authenticated can update sauce counters"
  ON public.sauces
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. TABLE recipes : Mise à jour des compteurs (likes, views)
-- ============================================================
-- La lecture est probablement déjà autorisée, mais ajoutons la mise à jour
DROP POLICY IF EXISTS "Anyone can view recipes" ON public.recipes;
CREATE POLICY "Anyone can view recipes"
  ON public.recipes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated can update recipe counters" ON public.recipes;
CREATE POLICY "Authenticated can update recipe counters"
  ON public.recipes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 6. TABLE comments : Commentaires sur les recettes
-- ============================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments"
  ON public.comments
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
CREATE POLICY "Authenticated users can insert comments"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
