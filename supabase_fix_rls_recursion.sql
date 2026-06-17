-- Corrige l'erreur "infinite recursion detected in policy for relation users"
-- Exécutez ce script dans le SQL Editor Supabase.

BEGIN;

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

DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Admins can read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin_user());

COMMIT;
