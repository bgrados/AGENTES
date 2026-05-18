-- Ejecutar en Supabase SQL Editor
-- Configura bucket de storage para fotos de agentes

-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public, avif_autodetect)
VALUES ('agent-photos', 'agent-photos', true, false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso
CREATE POLICY IF NOT EXISTS "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'agent-photos');

CREATE POLICY IF NOT EXISTS "Auth Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'agent-photos' AND auth.role() = 'authenticated');
