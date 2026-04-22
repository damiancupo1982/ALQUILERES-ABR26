/*
  # Agregar tabla de edificios

  ## Descripción
  Esta migración agrega una tabla para gestionar edificios de forma independiente,
  permitiendo crear y editar edificios que luego se asignan a las propiedades.

  ## 1. Nueva Tabla
  
  ### `buildings` (Edificios)
  - `id` (uuid, primary key) - Identificador único
  - `name` (text, unique) - Nombre del edificio
  - `address` (text) - Dirección del edificio
  - `notes` (text) - Notas adicionales
  - `created_at` (timestamptz) - Fecha de creación
  - `updated_at` (timestamptz) - Fecha de última modificación

  ## 2. Seguridad (RLS)
  - Se habilita RLS en la tabla buildings
  - Políticas permiten acceso completo a usuarios autenticados

  ## 3. Índices
  - Índice en el nombre del edificio para búsquedas rápidas

  ## 4. Notas Importantes
  - El nombre del edificio es único para evitar duplicados
  - Se usa trigger para actualizar updated_at automáticamente
*/

-- Crear tabla de edificios
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  address text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_buildings_name ON buildings(name);

-- Habilitar RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Políticas para buildings
CREATE POLICY "Usuarios autenticados pueden ver edificios"
  ON buildings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear edificios"
  ON buildings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar edificios"
  ON buildings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar edificios"
  ON buildings FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
