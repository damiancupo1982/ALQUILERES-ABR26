
-- Normalize delivery_type capitalization
UPDATE cash_movements
SET delivery_type = CASE
  WHEN LOWER(TRIM(delivery_type)) IN ('propietario') THEN 'propietario'
  WHEN LOWER(TRIM(delivery_type)) IN ('comision', 'comisión') THEN 'comision'
  WHEN LOWER(TRIM(delivery_type)) IN ('gasto') THEN 'gasto'
  ELSE delivery_type
END
WHERE delivery_type IS NOT NULL
  AND delivery_type != LOWER(TRIM(delivery_type));
