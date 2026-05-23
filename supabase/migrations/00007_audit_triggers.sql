-- Apply audit triggers to critical tables
-- This ensures all changes are logged in auditoria_logs

CREATE TRIGGER trg_auditoria_empresas
  AFTER INSERT OR UPDATE OR DELETE ON empresas
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_sedes
  AFTER INSERT OR UPDATE OR DELETE ON sedes
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_puestos
  AFTER INSERT OR UPDATE OR DELETE ON puestos
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_usuarios
  AFTER INSERT OR UPDATE OR DELETE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_agentes
  AFTER INSERT OR UPDATE OR DELETE ON agentes
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_asistencia
  AFTER INSERT OR UPDATE OR DELETE ON asistencia
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_reportes
  AFTER INSERT OR UPDATE OR DELETE ON reportes
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_incidencias
  AFTER INSERT OR UPDATE OR DELETE ON incidencias
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_configuracion
  AFTER INSERT OR UPDATE OR DELETE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

CREATE TRIGGER trg_auditoria_programacion_personal
  AFTER INSERT OR UPDATE OR DELETE ON programacion_personal
  FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();
