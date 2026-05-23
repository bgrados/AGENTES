-- ============================================
-- MIGRATION: 00011_batch_sync_and_postgis.sql
-- PURPOSE: Habilitar PostGIS para validación de GPS,
-- crear trigger de validación de radio, y crear
-- RPC para sincronización masiva offline.
-- ============================================

-- 1. Habilitar extensión PostGIS (requerido para cálculos geoespaciales precisos)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Función para calcular distancia en metros usando coordenadas GPS
CREATE OR REPLACE FUNCTION validate_gps_distance()
RETURNS TRIGGER AS $$
DECLARE
  sede_lat DOUBLE PRECISION;
  sede_lon DOUBLE PRECISION;
  radio_permitido INTEGER;
  distancia_metros DOUBLE PRECISION;
BEGIN
  -- Si no envían GPS, rechazar (o marcar como inválido dependiendo de la regla de negocio)
  -- Para este sistema estricto, asumiremos que si no hay GPS, es inválido.
  IF NEW.latitud IS NULL OR NEW.longitud IS NULL THEN
    NEW.gps_valido := FALSE;
    RETURN NEW;
  END IF;

  -- Obtener las coordenadas y el radio de la sede asignada a la asistencia/reporte
  SELECT latitud, longitud, radio_gps INTO sede_lat, sede_lon, radio_permitido
  FROM sedes
  WHERE id = NEW.sede_id;

  -- Si la sede no tiene coordenadas, asumimos válido (o reportamos error, aquí lo pasamos)
  IF sede_lat IS NULL OR sede_lon IS NULL THEN
    NEW.gps_valido := TRUE;
    RETURN NEW;
  END IF;

  -- Calcular la distancia en metros utilizando PostGIS Geography
  distancia_metros := ST_Distance(
    ST_MakePoint(NEW.longitud, NEW.latitud)::geography,
    ST_MakePoint(sede_lon, sede_lat)::geography
  );

  -- Validar si está dentro del radio permitido
  -- Si el radio es nulo, usamos 100m por defecto
  IF distancia_metros <= COALESCE(radio_permitido, 100) THEN
    NEW.gps_valido := TRUE;
  ELSE
    NEW.gps_valido := FALSE;
    
    -- Opcional: Generar una incidencia automática por marcación fuera de rango
    -- Insertamos en incidencias si es la tabla asistencia
    IF TG_TABLE_NAME = 'asistencia' THEN
      INSERT INTO incidencias (agente_id, sede_id, tipo, fecha, hora, descripcion, estado)
      VALUES (
        NEW.agente_id, 
        NEW.sede_id, 
        'gps_invalido', 
        NEW.fecha_hora::date, 
        NEW.fecha_hora::time, 
        format('Marcación fuera de rango: a %s metros de la sede (Límite: %s m).', ROUND(distancia_metros::numeric, 2), COALESCE(radio_permitido, 100)),
        'pendiente'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a la tabla asistencia
DROP TRIGGER IF EXISTS trigger_validate_gps_asistencia ON asistencia;
CREATE TRIGGER trigger_validate_gps_asistencia
BEFORE INSERT OR UPDATE ON asistencia
FOR EACH ROW
EXECUTE FUNCTION validate_gps_distance();

-- Aplicar trigger a la tabla reportes
DROP TRIGGER IF EXISTS trigger_validate_gps_reportes ON reportes;
CREATE TRIGGER trigger_validate_gps_reportes
BEFORE INSERT OR UPDATE ON reportes
FOR EACH ROW
EXECUTE FUNCTION validate_gps_distance();


-- 3. RPC para Sincronización Masiva Offline (Batch Sync)
-- Este RPC recibe un JSON gigante con todos los datos pendientes y los inserta en una sola transacción.
-- SECURITY INVOKER asegura que se apliquen las políticas RLS del usuario que llama al RPC.
CREATE OR REPLACE FUNCTION sync_offline_payload(payload jsonb)
RETURNS jsonb AS $$
DECLARE
  elem jsonb;
  res_asistencia int := 0;
  res_reportes int := 0;
  res_ubicaciones int := 0;
BEGIN
  -- Insertar Asistencias
  IF payload ? 'asistencia' THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(payload->'asistencia') LOOP
      INSERT INTO asistencia (agente_id, sede_id, tipo, latitud, longitud, foto_url, observaciones, created_at, fecha_hora)
      VALUES (
        (elem->>'agente_id')::uuid,
        (elem->>'sede_id')::uuid,
        (elem->>'tipo')::varchar,
        (elem->>'latitud')::double precision,
        (elem->>'longitud')::double precision,
        (elem->>'foto_url')::text,
        (elem->>'observaciones')::text,
        COALESCE((elem->>'created_at')::timestamptz, NOW()),
        COALESCE((elem->>'fecha_hora')::timestamptz, NOW())
      );
      res_asistencia := res_asistencia + 1;
    END LOOP;
  END IF;

  -- Insertar Reportes
  IF payload ? 'reportes' THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(payload->'reportes') LOOP
      INSERT INTO reportes (agente_id, sede_id, turno, hora_programada, tipo_reporte, foto_url, latitud, longitud, novedades, created_at, fecha_hora, fecha_reporte)
      VALUES (
        (elem->>'agente_id')::uuid,
        (elem->>'sede_id')::uuid,
        (elem->>'turno')::varchar,
        (elem->>'hora_programada')::time,
        (elem->>'tipo_reporte')::varchar,
        (elem->>'foto_url')::text,
        (elem->>'latitud')::double precision,
        (elem->>'longitud')::double precision,
        (elem->>'novedades')::text,
        COALESCE((elem->>'created_at')::timestamptz, NOW()),
        COALESCE((elem->>'fecha_hora')::timestamptz, NOW()),
        COALESCE((elem->>'fecha_reporte')::date, CURRENT_DATE)
      );
      res_reportes := res_reportes + 1;
    END LOOP;
  END IF;

  -- Insertar Ubicaciones
  IF payload ? 'ubicaciones' THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(payload->'ubicaciones') LOOP
      INSERT INTO historial_ubicaciones (agente_id, latitud, longitud, precision, bateria, fecha_hora)
      VALUES (
        (elem->>'agente_id')::uuid,
        (elem->>'latitud')::double precision,
        (elem->>'longitud')::double precision,
        (elem->>'precision')::double precision,
        (elem->>'bateria')::integer,
        COALESCE((elem->>'fecha_hora')::timestamptz, NOW())
      );
      res_ubicaciones := res_ubicaciones + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'inserted', jsonb_build_object(
      'asistencia', res_asistencia,
      'reportes', res_reportes,
      'ubicaciones', res_ubicaciones
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- En caso de error, toda la transacción hace rollback
  RAISE EXCEPTION 'Error sincronizando payload: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
