CREATE OR REPLACE FUNCTION trigger_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  SELECT id INTO v_usuario_id FROM usuarios WHERE auth_uid = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_nuevos)
    VALUES (v_usuario_id, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_anteriores, datos_nuevos)
    VALUES (v_usuario_id, TG_OP, TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO auditoria_logs(usuario_id, accion, tabla, registro_id, datos_anteriores)
    VALUES (v_usuario_id, TG_OP, TG_TABLE_NAME, OLD.id, row_to_json(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;