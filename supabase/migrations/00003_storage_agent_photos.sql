DO $$
BEGIN
  -- Crear bucket si no existe
  INSERT INTO storage.buckets (id, name, public, avif_autodetect)
  VALUES ('agent-photos', 'agent-photos', true, false)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Políticas de lectura pública
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'agent-photos');

-- Políticas de subida para usuarios autenticados
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');
