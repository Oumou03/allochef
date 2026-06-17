-- Bucket Supabase pour images et vidéos des sauces (chefs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sauce-media', 'sauce-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read sauce media" ON storage.objects;
CREATE POLICY "Public read sauce media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'sauce-media');

DROP POLICY IF EXISTS "Chef upload sauce media" ON storage.objects;
CREATE POLICY "Chef upload sauce media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sauce-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Chef update sauce media" ON storage.objects;
CREATE POLICY "Chef update sauce media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'sauce-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Chef delete sauce media" ON storage.objects;
CREATE POLICY "Chef delete sauce media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sauce-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
