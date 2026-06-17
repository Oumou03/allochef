-- Migration : engagement (vues, réponses chef), modération admin, commandes
-- Exécutez ce script dans le SQL Editor Supabase (idempotent).

BEGIN;

-- 1) Bannissement utilisateurs
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- 2) Vues et likes sur les sauces
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- 3) Réponse du chef aux commentaires
ALTER TABLE public.sauce_comments
  ADD COLUMN IF NOT EXISTS chef_reply TEXT;
ALTER TABLE public.sauce_comments
  ADD COLUMN IF NOT EXISTS chef_reply_at TIMESTAMP WITH TIME ZONE;

-- 4) Lien recette sur les commandes
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recipe_id UUID;

-- 5) Politiques RLS admin (fonction SECURITY DEFINER pour éviter la récursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND (is_admin = true OR role = 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;

DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users" ON public.users
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update chefs" ON public.chefs;
CREATE POLICY "Admins can update chefs" ON public.chefs
  FOR UPDATE TO authenticated
  USING (public.is_admin_user());

-- 6) Commandes : lecture/écriture pour l'utilisateur propriétaire
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
CREATE POLICY "Users can insert own orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Admins can read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin_user());

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own order items" ON public.order_items;
CREATE POLICY "Users can read own order items" ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

COMMIT;
