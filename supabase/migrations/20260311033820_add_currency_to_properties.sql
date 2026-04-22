/*
  # Agregar soporte de monedas a propiedades

  ## Descripción
  Esta migración agrega campos de moneda a la tabla de propiedades para
  permitir que el alquiler y expensas puedan estar en pesos (ARS) o dólares (USD).

  ## 1. Modificaciones a la tabla properties
  
  ### Nuevos campos:
  - `rent_currency` (text) - Moneda del alquiler: ARS o USD
  - `expenses_currency` (text) - Moneda de las expensas: ARS o USD

  ## 2. Notas Importantes
  - Los campos tienen valores por defecto 'ARS'
  - Se usa `IF NOT EXISTS` para evitar errores si ya existen
*/

-- Agregar campo de moneda para alquiler si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'rent_currency'
  ) THEN
    ALTER TABLE properties ADD COLUMN rent_currency text NOT NULL DEFAULT 'ARS';
  END IF;
END $$;

-- Agregar campo de moneda para expensas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'properties' AND column_name = 'expenses_currency'
  ) THEN
    ALTER TABLE properties ADD COLUMN expenses_currency text NOT NULL DEFAULT 'ARS';
  END IF;
END $$;

-- Crear índices para búsquedas por moneda
CREATE INDEX IF NOT EXISTS idx_properties_rent_currency ON properties(rent_currency);
CREATE INDEX IF NOT EXISTS idx_properties_expenses_currency ON properties(expenses_currency);
