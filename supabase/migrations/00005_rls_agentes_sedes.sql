-- Enable RLS (safe to run even if already enabled)
ALTER TABLE agentes_sedes ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admin_all_agentes_sedes" ON agentes_sedes
  FOR ALL
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

-- Agents can view their own assignments
CREATE POLICY "agentes_view_own" ON agentes_sedes
  FOR SELECT
  TO authenticated
  USING (
    agente_id IN (
      SELECT id FROM agentes WHERE usuario_id = auth.uid()
    )
  );
