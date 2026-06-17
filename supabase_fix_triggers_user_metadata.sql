-- ============================================================
-- CORRECTION DES TRIGGERS : user_metadata n'existe pas
-- La table public.users a directement une colonne "name",
-- pas de colonne "user_metadata".
--
-- Copiez-collez ce script dans le SQL Editor Supabase → Run
-- ============================================================

BEGIN;

-- 1) Corrige le trigger de notification pour les commentaires de sauce
CREATE OR REPLACE FUNCTION public.notify_sauce_comment()
RETURNS TRIGGER AS $$
DECLARE
  sauce_title TEXT;
  sauce_chef_user_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get sauce and chef info
  SELECT s.title, c.user_id
  INTO sauce_title, sauce_chef_user_id
  FROM public.sauces s
  LEFT JOIN public.chefs c ON c.id = s.chef_id
  WHERE s.id = NEW.sauce_id
  LIMIT 1;

  -- Get commenter name (colonne "name" directement dans users)
  SELECT u.name INTO commenter_name
  FROM public.users u
  WHERE u.id = NEW.user_id
  LIMIT 1;

  commenter_name := COALESCE(commenter_name, 'Un utilisateur');
  sauce_title := COALESCE(sauce_title, 'votre sauce');

  -- Only notify if chef exists and is different from commenter
  IF sauce_chef_user_id IS NOT NULL AND sauce_chef_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, link, is_read, metadata)
    VALUES (
      sauce_chef_user_id,
      'Nouveau commentaire sur ' || sauce_title,
      commenter_name || ' a commenté votre sauce.',
      '/sauce/' || NEW.sauce_id,
      false,
      jsonb_build_object('sauce_id', NEW.sauce_id, 'comment_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Corrige le trigger de notification pour les likes de sauce
CREATE OR REPLACE FUNCTION public.notify_sauce_like()
RETURNS TRIGGER AS $$
DECLARE
  sauce_title TEXT;
  sauce_chef_user_id UUID;
  liker_name TEXT;
BEGIN
  -- Get sauce and chef info
  SELECT s.title, c.user_id
  INTO sauce_title, sauce_chef_user_id
  FROM public.sauces s
  LEFT JOIN public.chefs c ON c.id = s.chef_id
  WHERE s.id = NEW.sauce_id
  LIMIT 1;

  -- Get liker name (colonne "name" directement dans users)
  SELECT u.name INTO liker_name
  FROM public.users u
  WHERE u.id = NEW.user_id
  LIMIT 1;

  liker_name := COALESCE(liker_name, 'Un utilisateur');
  sauce_title := COALESCE(sauce_title, 'votre sauce');

  -- Only notify if chef exists and is different from liker
  IF sauce_chef_user_id IS NOT NULL AND sauce_chef_user_id != NEW.user_id THEN
    INSERT INTO public.notifications (user_id, title, body, link, is_read, metadata)
    VALUES (
      sauce_chef_user_id,
      sauce_title || ' a reçu un like',
      liker_name || ' a aimé votre sauce.',
      '/sauce/' || NEW.sauce_id,
      false,
      jsonb_build_object('sauce_id', NEW.sauce_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
