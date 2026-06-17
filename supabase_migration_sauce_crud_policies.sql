-- Autoriser les chefs connectés à supprimer leurs sauces
DROP POLICY IF EXISTS "Allow auth delete sauces" ON public.sauces;
CREATE POLICY "Allow auth delete sauces"
  ON public.sauces
  FOR DELETE
  TO authenticated
  USING (true);
