-- Add jefe de grupo field to agentes_sedes
ALTER TABLE agentes_sedes
  ADD COLUMN IF NOT EXISTS es_jefe_grupo BOOLEAN NOT NULL DEFAULT false;

-- Only one jefe de grupo per sede (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_jefe_sede
  ON agentes_sedes (sede_id)
  WHERE es_jefe_grupo = true AND activo = true;
