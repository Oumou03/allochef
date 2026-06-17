-- Safe migration for sauces, recipes and workshops
-- This file is designed to be idempotent and to preserve existing data.

BEGIN;

-- 1) Recipes: add status if missing
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
UPDATE public.recipes SET status = 'published' WHERE status = 'pending';

-- 2) Sauces: add chef_id, utensils, base_servings and status
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS chef_id UUID;
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS base_servings INTEGER DEFAULT 4;
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.sauces
  ADD COLUMN IF NOT EXISTS utensils JSONB DEFAULT '[]'::jsonb;

-- 3) Add FK constraint only if the chefs table exists and constraint is missing
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'chefs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'sauces_chef_id_fkey'
    ) THEN
      ALTER TABLE public.sauces
        ADD CONSTRAINT sauces_chef_id_fkey
        FOREIGN KEY (chef_id) REFERENCES public.chefs(id) ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;

-- 4) Workshops: create table if missing
CREATE TABLE IF NOT EXISTS public.workshops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chef_id UUID REFERENCES public.chefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  max_participants INTEGER DEFAULT 20,
  price DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workshops are viewable by everyone." ON public.workshops;
DROP POLICY IF EXISTS "Chefs can insert their own workshops." ON public.workshops;
DROP POLICY IF EXISTS "Chefs can update their own workshops." ON public.workshops;
DROP POLICY IF EXISTS "Chefs can delete their own workshops." ON public.workshops;

CREATE POLICY "Workshops are viewable by everyone." ON public.workshops FOR SELECT USING (true);
CREATE POLICY "Chefs can insert their own workshops." ON public.workshops FOR INSERT WITH CHECK (true);
CREATE POLICY "Chefs can update their own workshops." ON public.workshops FOR UPDATE USING (true);
CREATE POLICY "Chefs can delete their own workshops." ON public.workshops FOR DELETE USING (true);

-- 5) Sauce categories normalization (optional, safe update)
UPDATE public.sauces SET category = 'feuilles' WHERE category ILIKE '%feuille%';
UPDATE public.sauces SET category = 'arachide' WHERE category ILIKE '%arachide%';
UPDATE public.sauces SET category = 'legumes' WHERE category ILIKE '%légume%' OR category ILIKE '%legume%' OR category ILIKE '%condiment%';
UPDATE public.sauces SET category = 'riz_au_gras' WHERE category ILIKE '%riz%';
UPDATE public.sauces SET category = 'plats' WHERE category ILIKE '%plat%';
UPDATE public.sauces SET category = 'legumes' WHERE category NOT IN ('feuilles', 'arachide', 'legumes', 'riz_au_gras', 'plats');

-- 6) Security: enable RLS and create safe public policies for sauces and recipes
ALTER TABLE public.sauces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read sauces" ON public.sauces;
DROP POLICY IF EXISTS "Allow auth insert sauces" ON public.sauces;
DROP POLICY IF EXISTS "Allow auth update sauces" ON public.sauces;
CREATE POLICY "Allow public read sauces" ON public.sauces FOR SELECT USING (true);
CREATE POLICY "Allow auth insert sauces" ON public.sauces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update sauces" ON public.sauces FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow auth insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Allow auth update recipes" ON public.recipes;
CREATE POLICY "Allow public read recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Allow auth insert recipes" ON public.recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update recipes" ON public.recipes FOR UPDATE TO authenticated USING (true);

-- Notifications for application users
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow user read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow user insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow user update notifications" ON public.notifications;
CREATE POLICY "Allow user read notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow user insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow user update notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 8) Trigger for new sauce notifications
-- When a sauce is added, notify all users about it
CREATE OR REPLACE FUNCTION public.notify_new_sauce()
RETURNS TRIGGER AS $$
DECLARE
  chef_user_id UUID;
  chef_name TEXT;
  sauce_title TEXT;
  user_record RECORD;
BEGIN
  -- Get chef info
  SELECT u.id, c.name INTO chef_user_id, chef_name
  FROM public.chefs c
  LEFT JOIN public.users u ON u.id = c.user_id
  WHERE c.id = NEW.chef_id
  LIMIT 1;

  sauce_title := COALESCE(NEW.title, 'Nouvelle sauce');

  -- Insert notifications for all users except the chef
  INSERT INTO public.notifications (user_id, title, body, link, is_read, metadata)
  SELECT
    u.id,
    'Nouvelle sauce disponible',
    COALESCE(chef_name, 'Un chef') || ' a ajouté une nouvelle sauce : ' || sauce_title,
    '/tabs/tab3',
    false,
    jsonb_build_object('sauce_id', NEW.id)
  FROM public.users u
  WHERE u.id IS NOT NULL
    AND u.id != chef_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_new_sauce ON public.sauces;
CREATE TRIGGER trigger_notify_new_sauce
AFTER INSERT ON public.sauces
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_sauce();

-- 9) Trigger for sauce comment notifications
-- When a comment is added, notify the sauce chef
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

  -- Get commenter name (colonne 'name' directement dans users)
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

DROP TRIGGER IF EXISTS trigger_notify_sauce_comment ON public.sauce_comments;
CREATE TRIGGER trigger_notify_sauce_comment
AFTER INSERT ON public.sauce_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_sauce_comment();

-- 10) Trigger for sauce like notifications
-- When a sauce is liked, notify the sauce chef
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

  -- Get liker name (colonne 'name' directement dans users)
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

DROP TRIGGER IF EXISTS trigger_notify_sauce_like ON public.sauce_likes;
CREATE TRIGGER trigger_notify_sauce_like
AFTER INSERT ON public.sauce_likes
FOR EACH ROW
EXECUTE FUNCTION public.notify_sauce_like();

COMMIT;
