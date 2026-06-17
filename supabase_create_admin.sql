-- Créer / promouvoir un compte administrateur AlloChef
-- Exécutez dans Supabase → SQL Editor (après avoir créé l'utilisateur dans Auth).

-- ÉTAPE 1 (obligatoire, dans l'interface Supabase, PAS en SQL) :
--   Authentication → Users → Add user
--   - Email : admin@allochef.com  (remplacez par le vôtre)
--   - Password : votre mot de passe (min. 6 caractères)
--   - Cochez "Auto Confirm User"
--
-- ÉTAPE 2 : promouvoir ce compte en admin (remplacez l'email ci-dessous)

UPDATE public.users
SET role = 'admin', is_admin = true, is_banned = false
WHERE email = 'admin@allochef.com';

-- Si la ligne n'existe pas encore dans public.users, la créer depuis auth.users :
INSERT INTO public.users (id, email, name, role, is_admin, is_banned)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1), 'Administrateur'),
  'admin',
  true,
  false
FROM auth.users au
WHERE au.email = 'admin@allochef.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', is_admin = true, is_banned = false;

-- Vérification :
SELECT id, email, role, is_admin, is_banned
FROM public.users
WHERE email = 'admin@allochef.com';
