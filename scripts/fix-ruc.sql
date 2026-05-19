-- Corrige RUCs existentes: RUC = '10' + DNI (persona natural Perú)
-- Solo actualiza registros donde DNI tiene 8 dígitos
UPDATE usuarios
SET ruc = '10' || dni
WHERE dni IS NOT NULL
  AND length(dni) = 8
  AND (ruc IS NULL OR ruc != '10' || dni);
