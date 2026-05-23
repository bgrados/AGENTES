-- ============================================
-- MIGRATION: 00010_rls_security_policies.sql
-- PURPOSE: Habilitar RLS estricto en todas las tablas principales
-- y establecer políticas de acceso granulares para Agentes,
-- Jefes de Grupo y Administradores.
-- ============================================

-- 1. Habilitar RLS
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE puestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisores ENABLE ROW LEVEL SECURITY;
ALTER TABLE jefes_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE programacion_personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE relevos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_ubicaciones ENABLE ROW LEVEL SECURITY;

-- 2. Funciones Auxiliares para Políticas
-- Obtiene el ID del agente logueado de manera segura
CREATE OR REPLACE FUNCTION current_agente_id()
RETURNS UUID AS $$
  SELECT id FROM agentes WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obtiene el ID de la empresa del usuario logueado
CREATE OR REPLACE FUNCTION current_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica si el usuario autenticado tiene el rol de supervisor
CREATE OR REPLACE FUNCTION es_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_uid = auth.uid() AND r.nombre = 'supervisor'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifica si el usuario autenticado tiene el rol de jefe_grupo
CREATE OR REPLACE FUNCTION es_jefe_grupo()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios u JOIN roles r ON u.rol_id = r.id
    WHERE u.auth_uid = auth.uid() AND r.nombre = 'jefe_grupo'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. POLÍTICAS GLOBALES (ADMINISTRADORES)
-- Admin tiene acceso total. La función es_admin() ya fue definida en 00001_schema.sql.
CREATE POLICY "admin_all_empresas" ON empresas FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_sedes" ON sedes FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_puestos" ON puestos FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_usuarios" ON usuarios FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_agentes" ON agentes FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_supervisores" ON supervisores FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_jefes_grupo" ON jefes_grupo FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_programacion" ON programacion_personal FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_asistencia" ON asistencia FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_relevos" ON relevos FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_reportes" ON reportes FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_incidencias" ON incidencias FOR ALL TO authenticated USING (es_admin());
CREATE POLICY "admin_all_ubicaciones" ON historial_ubicaciones FOR ALL TO authenticated USING (es_admin());

-- 4. POLÍTICAS DE LECTURA BASE (Cualquier usuario logueado)
-- Los usuarios pueden leer información estática de la empresa y sedes a la que pertenecen
CREATE POLICY "usuarios_select_empresa" ON empresas FOR SELECT TO authenticated
USING (id = current_empresa_id());

CREATE POLICY "usuarios_select_sedes" ON sedes FOR SELECT TO authenticated
USING (empresa_id = current_empresa_id());

CREATE POLICY "usuarios_select_puestos" ON puestos FOR SELECT TO authenticated
USING (sede_id IN (SELECT id FROM sedes WHERE empresa_id = current_empresa_id()));

CREATE POLICY "usuarios_select_propio" ON usuarios FOR SELECT TO authenticated
USING (auth_uid = auth.uid());

-- 5. POLÍTICAS DE AGENTES (Zero Trust)
-- Un Agente SOLO puede leer sus propios datos y NO puede hacer UPDATE/DELETE de sus registros de asistencia.

-- Leer su perfil
CREATE POLICY "agente_select_perfil" ON agentes FOR SELECT TO authenticated
USING (id = current_agente_id());

-- Programación personal
CREATE POLICY "agente_select_programacion" ON programacion_personal FOR SELECT TO authenticated
USING (agente_id = current_agente_id());

-- Asistencia
CREATE POLICY "agente_select_asistencia" ON asistencia FOR SELECT TO authenticated
USING (agente_id = current_agente_id());

CREATE POLICY "agente_insert_asistencia" ON asistencia FOR INSERT TO authenticated
WITH CHECK (agente_id = current_agente_id());

-- Reportes
CREATE POLICY "agente_select_reportes" ON reportes FOR SELECT TO authenticated
USING (agente_id = current_agente_id());

CREATE POLICY "agente_insert_reportes" ON reportes FOR INSERT TO authenticated
WITH CHECK (agente_id = current_agente_id());

-- Historial de Ubicaciones
CREATE POLICY "agente_select_ubicaciones" ON historial_ubicaciones FOR SELECT TO authenticated
USING (agente_id = current_agente_id());

CREATE POLICY "agente_insert_ubicaciones" ON historial_ubicaciones FOR INSERT TO authenticated
WITH CHECK (agente_id = current_agente_id());

-- Relevos (participa como entrante o saliente)
CREATE POLICY "agente_select_relevos" ON relevos FOR SELECT TO authenticated
USING (agente_entrante_id = current_agente_id() OR agente_saliente_id = current_agente_id());

CREATE POLICY "agente_insert_relevos" ON relevos FOR INSERT TO authenticated
WITH CHECK (agente_entrante_id = current_agente_id() OR agente_saliente_id = current_agente_id());

-- Incidencias
CREATE POLICY "agente_select_incidencias" ON incidencias FOR SELECT TO authenticated
USING (agente_id = current_agente_id());

CREATE POLICY "agente_insert_incidencias" ON incidencias FOR INSERT TO authenticated
WITH CHECK (agente_id = current_agente_id());


-- 6. POLÍTICAS DE SUPERVISORES Y JEFES DE GRUPO
-- Los Supervisores y Jefes de Grupo pueden LEER las asistencias, reportes, ubicaciones 
-- e incidencias de los agentes asignados a sus sedes.

-- Asistencia
CREATE POLICY "sup_jefe_select_asistencia" ON asistencia FOR SELECT TO authenticated
USING (
  (es_supervisor() AND sede_id IN (SELECT unnest(sedes_ids) FROM supervisores WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
  OR 
  (es_jefe_grupo() AND sede_id = (SELECT sede_id FROM jefes_grupo WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
);

-- Reportes
CREATE POLICY "sup_jefe_select_reportes" ON reportes FOR SELECT TO authenticated
USING (
  (es_supervisor() AND sede_id IN (SELECT unnest(sedes_ids) FROM supervisores WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
  OR 
  (es_jefe_grupo() AND sede_id = (SELECT sede_id FROM jefes_grupo WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
);

-- Incidencias
CREATE POLICY "sup_jefe_select_incidencias" ON incidencias FOR SELECT TO authenticated
USING (
  (es_supervisor() AND sede_id IN (SELECT unnest(sedes_ids) FROM supervisores WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
  OR 
  (es_jefe_grupo() AND sede_id = (SELECT sede_id FROM jefes_grupo WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
);

-- Relevos
CREATE POLICY "sup_jefe_select_relevos" ON relevos FOR SELECT TO authenticated
USING (
  (es_supervisor() AND sede_id IN (SELECT unnest(sedes_ids) FROM supervisores WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
  OR 
  (es_jefe_grupo() AND sede_id = (SELECT sede_id FROM jefes_grupo WHERE usuario_id = (SELECT id FROM usuarios WHERE auth_uid = auth.uid() LIMIT 1)))
);
