
-- Fix function search path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Restrict notes file listing to owner only (downloads still work via direct URL since bucket is public)
DROP POLICY IF EXISTS "Notes files public read" ON storage.objects;
CREATE POLICY "Owner list own notes files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notes' AND auth.uid()::text = (storage.foldername(name))[1]);
