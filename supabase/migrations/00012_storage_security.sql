-- ============================================
-- MIGRATION: 00012_storage_security.sql
-- PURPOSE: Asegurar el bucket de fotos, evitando que
-- agentes modifiquen o borren evidencias fotográficas
-- una vez subidas.
-- ============================================

-- Remover políticas amplias previas
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Los administradores pueden modificar y eliminar fotos
CREATE POLICY "Admin Update Photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'agent-photos' AND es_admin());

CREATE POLICY "Admin Delete Photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'agent-photos' AND es_admin());

-- NOTA: La política "Auth Upload" de la migración 00003 se mantiene
-- permitiendo que los agentes suban (INSERT), pero ya no pueden UPDATE/DELETE.
