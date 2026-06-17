-- Notifications cross-user via RPC (contourne RLS pour likes/commentaires chef)
-- Exécutez dans le SQL Editor Supabase.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_app_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise';
  END IF;

  INSERT INTO public.notifications (user_id, title, body, link, is_read, metadata)
  VALUES (p_user_id, p_title, p_body, p_link, false, COALESCE(p_metadata, '{}'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_app_notification(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

COMMIT;
