-- Crear tabla de ajustes de cuenta corriente de inquilinos
CREATE TABLE IF NOT EXISTS tenant_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_tenant_id ON tenant_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_adjustments_date ON tenant_adjustments(date);

-- Habilitar RLS
ALTER TABLE tenant_adjustments ENABLE ROW LEVEL SECURITY;

-- Políticas para tenant_adjustments
CREATE POLICY "Usuarios autenticados pueden ver ajustes de inquilinos"
  ON tenant_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear ajustes de inquilinos"
  ON tenant_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar ajustes de inquilinos"
  ON tenant_adjustments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar ajustes de inquilinos"
  ON tenant_adjustments FOR DELETE
  TO authenticated
  USING (true);
