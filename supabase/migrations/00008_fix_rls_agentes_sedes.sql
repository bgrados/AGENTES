-- Fix RLS policy on agentes_sedes
-- The old policy incorrectly compared usuarios.id with auth.uid()
-- The correct comparison is usuarios.auth_uid = auth.uid()

DROP POLICY IF EXISTS "agentes_view_own" ON agentes_sedes;
DROP POLICY IF EXISTS "admin_all_agentes_sedes" ON agentes_sedes;

-- Admins can do everything
CREATE POLICY "admin_all_agentes_sedes" ON agentes_sedes
  FOR ALL
  TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

-- Agents can view their own assignments (fixed: join through auth_uid)
CREATE POLICY "agentes_view_own" ON agentes_sedes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agentes a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = agentes_sedes.agente_id AND u.auth_uid = auth.uid()
    )
  );
