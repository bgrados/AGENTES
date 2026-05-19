CREATE TABLE IF NOT EXISTS agentes_sedes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agente_id UUID NOT NULL REFERENCES agentes(id) ON DELETE CASCADE,
  sede_id UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('principal', 'apoyo')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agente_id, sede_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agente_principal
  ON agentes_sedes (agente_id)
  WHERE tipo = 'principal' AND activo = TRUE;

INSERT INTO agentes_sedes (agente_id, sede_id, tipo, activo)
SELECT id, sede_principal, 'principal', TRUE
FROM agentes
WHERE sede_principal IS NOT NULL
ON CONFLICT (agente_id, sede_id) DO NOTHING;
