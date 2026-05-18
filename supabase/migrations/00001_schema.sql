-- ============================================
-- SCHEMA COMPLETO - Sistema Control Asistencia
-- Version: 1.0.0
-- ============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. EMPRESAS
CREATE TABLE empresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(255) NOT NULL,
  ruc         VARCHAR(11) UNIQUE,
  direccion   TEXT,
  telefono    VARCHAR(20),
  email       VARCHAR(255),
  logo_url    TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SEDES
CREATE TABLE sedes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nombre      VARCHAR(255) NOT NULL,
  direccion   TEXT,
  latitud     DOUBLE PRECISION,
  longitud    DOUBLE PRECISION,
  radio_gps   INTEGER DEFAULT 100,
  codigo      VARCHAR(20) UNIQUE NOT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sedes_empresa ON sedes(empresa_id);

-- 3. PUESTOS
CREATE TABLE puestos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id       UUID NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre        VARCHAR(255) NOT NULL,
  codigo        VARCHAR(20) UNIQUE NOT NULL,
  qr_code       TEXT UNIQUE,
  qr_activo     BOOLEAN DEFAULT TRUE,
  qr_expiracion TIMESTAMPTZ,
  latitud       DOUBLE PRECISION,
  longitud      DOUBLE PRECISION,
  radio_gps     INTEGER DEFAULT 50,
  requiere_gps  BOOLEAN DEFAULT TRUE,
  requiere_qr   BOOLEAN DEFAULT TRUE,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_puestos_sede ON puestos(sede_id);

-- 4. ROLES
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      VARCHAR(50) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. USUARIOS
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_uid      UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id    UUID NOT NULL REFERENCES empresas(id),
  rol_id        UUID NOT NULL REFERENCES roles(id),
  codigo        VARCHAR(20) UNIQUE,
  nombre        VARCHAR(100) NOT NULL,
  apellido      VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  telefono      VARCHAR(20),
  foto_url      TEXT,
  activo        BOOLEAN DEFAULT TRUE,
  ultimo_acceso TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);

-- 6. AGENTES
CREATE TABLE agentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  turno_asignado  VARCHAR(10) NOT NULL CHECK (turno_asignado IN ('dia', 'noche')),
  dia_descanso    INTEGER CHECK (dia_descanso BETWEEN 1 AND 7),
  fecha_ingreso   DATE NOT NULL DEFAULT CURRENT_DATE,
  sede_principal  UUID REFERENCES sedes(id),
  foto_url        TEXT,
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SUPERVISORES
CREATE TABLE supervisores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sedes_ids   UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 8. JEFES_GRUPO
CREATE TABLE jefes_grupo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sede_id     UUID NOT NULL REFERENCES sedes(id),
  turno       VARCHAR(10) NOT NULL CHECK (turno IN ('dia', 'noche')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 9. PROGRAMACION PERSONAL
CREATE TABLE programacion_personal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES agentes(id),
  sede_id       UUID NOT NULL REFERENCES sedes(id),
  puesto_id     UUID REFERENCES puestos(id),
  fecha         DATE NOT NULL,
  turno         VARCHAR(10) NOT NULL CHECK (turno IN ('dia', 'noche')),
  es_descanso   BOOLEAN DEFAULT FALSE,
  es_reemplazo  BOOLEAN DEFAULT FALSE,
  creado_por    UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agente_id, fecha)
);
CREATE INDEX idx_programacion_fecha ON programacion_personal(fecha);
CREATE INDEX idx_programacion_agente ON programacion_personal(agente_id);

-- 10. ASISTENCIA
CREATE TABLE asistencia (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES agentes(id),
  sede_id       UUID NOT NULL REFERENCES sedes(id),
  puesto_id     UUID REFERENCES puestos(id),
  tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'relevo_entrada', 'relevo_salida')),
  fecha_hora    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitud       DOUBLE PRECISION,
  longitud      DOUBLE PRECISION,
  gps_valido    BOOLEAN,
  gps_precision DOUBLE PRECISION,
  qr_valido     BOOLEAN,
  qr_escanado   TEXT,
  foto_url      TEXT,
  es_manual     BOOLEAN DEFAULT FALSE,
  validado_por  UUID REFERENCES usuarios(id),
  observaciones TEXT,
  dispositivo   VARCHAR(255),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_asistencia_agente ON asistencia(agente_id);
CREATE INDEX idx_asistencia_fecha ON asistencia(fecha_hora);
CREATE INDEX idx_asistencia_sede ON asistencia(sede_id);

-- 11. RELEVOS
CREATE TABLE relevos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id             UUID NOT NULL REFERENCES sedes(id),
  puesto_id           UUID REFERENCES puestos(id),
  agente_saliente_id  UUID REFERENCES agentes(id),
  agente_entrante_id  UUID NOT NULL REFERENCES agentes(id),
  turno_saliente      VARCHAR(10) CHECK (turno_saliente IN ('dia', 'noche')),
  turno_entrante      VARCHAR(10) CHECK (turno_entrante IN ('dia', 'noche')),
  fecha_hora          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  foto_conjunta_url   TEXT,
  latitud             DOUBLE PRECISION,
  longitud            DOUBLE PRECISION,
  observaciones       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_relevos_sede ON relevos(sede_id);

-- 12. REPORTES
CREATE TABLE reportes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id         UUID NOT NULL REFERENCES agentes(id),
  sede_id           UUID NOT NULL REFERENCES sedes(id),
  puesto_id         UUID REFERENCES puestos(id),
  turno             VARCHAR(10) NOT NULL CHECK (turno IN ('dia', 'noche')),
  hora_programada   TIME NOT NULL,
  fecha_reporte     DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_hora        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo_reporte      VARCHAR(20) NOT NULL CHECK (tipo_reporte IN ('con_foto', 'sin_foto')),
  foto_url          TEXT,
  latitud           DOUBLE PRECISION,
  longitud          DOUBLE PRECISION,
  gps_valido        BOOLEAN,
  novedades         TEXT,
  agentes_presentes TEXT[],
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agente_id, fecha_reporte, hora_programada)
);
CREATE INDEX idx_reportes_fecha ON reportes(fecha_reporte);
CREATE INDEX idx_reportes_sede ON reportes(sede_id);

-- 13. INCIDENCIAS
CREATE TABLE incidencias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID REFERENCES agentes(id),
  sede_id       UUID NOT NULL REFERENCES sedes(id),
  tipo          VARCHAR(30) NOT NULL CHECK (tipo IN ('tardanza', 'falta', 'gps_invalido', 'qr_invalido', 'reporte_faltante', 'cobertura', 'otro')),
  fecha         DATE NOT NULL,
  hora          TIME,
  descripcion   TEXT NOT NULL,
  estado        VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'investigacion')),
  evidencia_url TEXT,
  validado_por  UUID REFERENCES usuarios(id),
  validado_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_incidencias_estado ON incidencias(estado);
CREATE INDEX idx_incidencias_fecha ON incidencias(fecha);

-- 14. HISTORIAL UBICACIONES
CREATE TABLE historial_ubicaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id   UUID NOT NULL REFERENCES agentes(id),
  latitud     DOUBLE PRECISION NOT NULL,
  longitud    DOUBLE PRECISION NOT NULL,
  precision   DOUBLE PRECISION,
  velocidad   DOUBLE PRECISION,
  altitud     DOUBLE PRECISION,
  bateria     INTEGER,
  fecha_hora  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ubicaciones_agente ON historial_ubicaciones(agente_id);
CREATE INDEX idx_ubicaciones_fecha ON historial_ubicaciones(fecha_hora);
CREATE INDEX idx_ubicaciones_tiempo ON historial_ubicaciones(fecha_hora DESC);

-- 15. GRUPOS WHATSAPP
CREATE TABLE grupos_whatsapp (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id       UUID NOT NULL REFERENCES sedes(id),
  turno         VARCHAR(10) NOT NULL CHECK (turno IN ('dia', 'noche')),
  numero_grupo  VARCHAR(50) NOT NULL,
  nombre_grupo  VARCHAR(255),
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sede_id, turno)
);

-- 16. NOTIFICACIONES PUSH
CREATE TABLE notificaciones_push (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES usuarios(id),
  subscription    JSONB NOT NULL,
  dispositivo     VARCHAR(50),
  activo          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  last_used_at    TIMESTAMPTZ
);

-- 17. LOG NOTIFICACIONES
CREATE TABLE log_notificaciones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  titulo      VARCHAR(255) NOT NULL,
  mensaje     TEXT,
  tipo        VARCHAR(50),
  leida       BOOLEAN DEFAULT FALSE,
  leida_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_log_notif_usuario ON log_notificaciones(usuario_id);
CREATE INDEX idx_log_notif_leida ON log_notificaciones(leida) WHERE leida = FALSE;

-- 18. ARCHIVOS FOTOS
CREATE TABLE archivos_fotos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket      VARCHAR(50) NOT NULL,
  ruta        TEXT NOT NULL,
  nombre      VARCHAR(255),
  tipo        VARCHAR(100),
  tamano      INTEGER,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 19. AUDITORIA LOGS
CREATE TABLE auditoria_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES usuarios(id),
  accion          VARCHAR(50) NOT NULL,
  tabla           VARCHAR(100),
  registro_id     UUID,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  direccion_ip    VARCHAR(45),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auditoria_usuario ON auditoria_logs(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria_logs(created_at);

-- 20. SYNC QUEUE
CREATE TABLE sync_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL,
  operacion       VARCHAR(20) NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
  tabla           VARCHAR(100) NOT NULL,
  registro_id     UUID,
  datos           JSONB NOT NULL,
  dispositivo_id  VARCHAR(100),
  estado          VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'procesado', 'error', 'conflicto')),
  error_mensaje   TEXT,
  intentos        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  procesado_at    TIMESTAMPTZ
);
CREATE INDEX idx_sync_estado ON sync_queue(estado);
CREATE INDEX idx_sync_usuario ON sync_queue(usuario_id);

-- 21. CONFIGURACION
CREATE TABLE configuracion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id),
  clave         VARCHAR(100) NOT NULL,
  valor         JSONB NOT NULL,
  descripcion   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, clave)
);

-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION trigger_auditoria()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_nuevos)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_anteriores)
    VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-detección de tardanzas
CREATE OR REPLACE FUNCTION detectar_tardanza()
RETURNS TRIGGER AS $$
DECLARE
  v_hora_entrada TIME;
  v_tolerancia INTEGER;
BEGIN
  v_tolerancia := COALESCE(
    (SELECT (valor->>'minutos')::integer FROM configuracion WHERE clave = 'tolerancia_tardanza' LIMIT 1),
    15
  );
  IF NEW.turno = 'dia' THEN
    v_hora_entrada := '07:00:00';
  ELSE
    v_hora_entrada := '19:00:00';
  END IF;
  IF NEW.fecha_hora::time > (v_hora_entrada + (v_tolerancia || ' minutes')::INTERVAL) THEN
    INSERT INTO incidencias(agente_id, sede_id, tipo, fecha, hora, descripcion, estado)
    VALUES (NEW.agente_id, NEW.sede_id, 'tardanza', NEW.fecha_hora::date,
            NEW.fecha_hora::time,
            format('Tardanza: esperado %s, marcó %s', v_hora_entrada, NEW.fecha_hora::time),
            'pendiente');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS
-- ============================================

CREATE OR REPLACE FUNCTION usuario_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuarios WHERE auth_uid = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_uid = auth.uid() AND r.nombre = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Seed roles
INSERT INTO roles (nombre, descripcion) VALUES
  ('admin', 'Administrador del sistema'),
  ('supervisor', 'Supervisor de operaciones'),
  ('jefe_grupo', 'Jefe de grupo de seguridad'),
  ('agente', 'Agente de seguridad')
ON CONFLICT (nombre) DO NOTHING;
