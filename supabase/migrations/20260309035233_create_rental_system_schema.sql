/*
  # Sistema de Administración de Alquileres - Esquema Base

  ## Descripción General
  Este esquema crea todas las tablas necesarias para gestionar propiedades, inquilinos,
  recibos y movimientos de caja en un sistema de administración de alquileres.

  ## 1. Nuevas Tablas
  
  ### `properties` (Propiedades)
  - `id` (uuid, primary key) - Identificador único
  - `name` (text) - Nombre de la propiedad
  - `type` (text) - Tipo: departamento, galpón, local, oficina, otro
  - `building` (text) - Nombre del edificio
  - `address` (text) - Dirección completa
  - `rent` (numeric) - Monto del alquiler
  - `expenses` (numeric) - Monto de expensas
  - `next_update_date` (date) - Fecha de próxima actualización de valores
  - `tenant_name` (text, nullable) - Nombre del inquilino actual
  - `status` (text) - Estado: ocupado, disponible, mantenimiento
  - `contract_start` (date, nullable) - Inicio del contrato
  - `contract_end` (date, nullable) - Fin del contrato
  - `last_updated` (date) - Última actualización
  - `notes` (text) - Notas adicionales
  - `created_at` (timestamptz) - Fecha de creación
  - `updated_at` (timestamptz) - Fecha de última modificación

  ### `tenants` (Inquilinos)
  - `id` (uuid, primary key) - Identificador único
  - `name` (text) - Nombre completo
  - `email` (text) - Email
  - `phone` (text) - Teléfono
  - `property_id` (uuid, nullable, foreign key) - Propiedad asignada
  - `contract_start` (date) - Inicio del contrato
  - `contract_end` (date) - Fin del contrato
  - `deposit` (numeric) - Monto del depósito
  - `guarantor_name` (text) - Nombre del garante
  - `guarantor_email` (text) - Email del garante
  - `guarantor_phone` (text) - Teléfono del garante
  - `balance` (numeric) - Saldo pendiente
  - `status` (text) - Estado: activo, vencido, pendiente
  - `created_at` (timestamptz) - Fecha de creación
  - `updated_at` (timestamptz) - Fecha de última modificación

  ### `receipts` (Recibos)
  - `id` (uuid, primary key) - Identificador único
  - `receipt_number` (text) - Número de recibo
  - `tenant_id` (uuid, nullable) - Referencia al inquilino
  - `tenant_name` (text) - Nombre del inquilino
  - `property_name` (text) - Nombre de la propiedad
  - `building` (text) - Edificio
  - `month` (text) - Mes del recibo
  - `year` (integer) - Año del recibo
  - `rent` (numeric) - Monto del alquiler
  - `expenses` (numeric) - Monto de expensas
  - `other_charges` (jsonb) - Otros cargos adicionales
  - `previous_balance` (numeric) - Saldo anterior
  - `total` (numeric) - Total a pagar
  - `paid_amount` (numeric) - Monto pagado
  - `remaining_balance` (numeric) - Saldo pendiente
  - `currency` (text) - Moneda: ARS, USD
  - `payment_method` (text) - Método: efectivo, transferencia, dolares
  - `status` (text) - Estado: pagado, pendiente, vencido, borrador
  - `due_date` (date) - Fecha de vencimiento
  - `created_date` (date) - Fecha de emisión
  - `created_at` (timestamptz) - Fecha de creación
  - `updated_at` (timestamptz) - Fecha de última modificación

  ### `cash_movements` (Movimientos de Caja)
  - `id` (uuid, primary key) - Identificador único
  - `type` (text) - Tipo: income (ingreso), delivery (entrega)
  - `description` (text) - Descripción del movimiento
  - `amount` (numeric) - Monto
  - `currency` (text) - Moneda: ARS, USD
  - `date` (date) - Fecha del movimiento
  - `tenant_name` (text, nullable) - Nombre del inquilino (para ingresos)
  - `property_name` (text, nullable) - Nombre de la propiedad (para ingresos)
  - `payment_method` (text, nullable) - Método de pago
  - `delivery_type` (text, nullable) - Tipo de entrega: propietario, comision, gasto
  - `created_at` (timestamptz) - Fecha de creación

  ## 2. Seguridad (RLS)
  - Se habilita RLS en todas las tablas
  - Las políticas permiten acceso completo a usuarios autenticados
  - Los datos están protegidos y solo accesibles mediante autenticación

  ## 3. Índices
  - Índices en campos de búsqueda frecuente para mejor rendimiento
  - Índices en claves foráneas para optimizar joins

  ## 4. Notas Importantes
  - Todos los montos se almacenan como `numeric` para precisión decimal
  - Las fechas usan el formato estándar de PostgreSQL
  - Los campos JSON almacenan arrays de objetos para cargos adicionales
  - Se usa `timestamptz` para timestamps con zona horaria
*/

-- Crear tabla de propiedades
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'departamento',
  building text NOT NULL,
  address text NOT NULL,
  rent numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  next_update_date date,
  tenant_name text,
  status text NOT NULL DEFAULT 'disponible',
  contract_start date,
  contract_end date,
  last_updated date DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de inquilinos
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
  contract_start date NOT NULL,
  contract_end date NOT NULL,
  deposit numeric NOT NULL DEFAULT 0,
  guarantor_name text NOT NULL,
  guarantor_email text NOT NULL,
  guarantor_phone text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'activo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de recibos
CREATE TABLE IF NOT EXISTS receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_name text NOT NULL,
  property_name text NOT NULL,
  building text NOT NULL,
  month text NOT NULL,
  year integer NOT NULL,
  rent numeric NOT NULL DEFAULT 0,
  expenses numeric NOT NULL DEFAULT 0,
  other_charges jsonb DEFAULT '[]'::jsonb,
  previous_balance numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ARS',
  payment_method text NOT NULL DEFAULT 'efectivo',
  status text NOT NULL DEFAULT 'borrador',
  due_date date NOT NULL,
  created_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear tabla de movimientos de caja
CREATE TABLE IF NOT EXISTS cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'ARS',
  date date NOT NULL DEFAULT CURRENT_DATE,
  tenant_name text,
  property_name text,
  payment_method text,
  delivery_type text,
  created_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_properties_building ON properties(building);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_name ON properties(tenant_name);

CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_name ON tenants(name);

CREATE INDEX IF NOT EXISTS idx_receipts_tenant_id ON receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_year ON receipts(year);
CREATE INDEX IF NOT EXISTS idx_receipts_month ON receipts(month);
CREATE INDEX IF NOT EXISTS idx_receipts_created_date ON receipts(created_date);

CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_currency ON cash_movements(currency);

-- Habilitar RLS en todas las tablas
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas para properties
CREATE POLICY "Usuarios autenticados pueden ver propiedades"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear propiedades"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar propiedades"
  ON properties FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar propiedades"
  ON properties FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para tenants
CREATE POLICY "Usuarios autenticados pueden ver inquilinos"
  ON tenants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear inquilinos"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar inquilinos"
  ON tenants FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar inquilinos"
  ON tenants FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para receipts
CREATE POLICY "Usuarios autenticados pueden ver recibos"
  ON receipts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear recibos"
  ON receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar recibos"
  ON receipts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar recibos"
  ON receipts FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para cash_movements
CREATE POLICY "Usuarios autenticados pueden ver movimientos de caja"
  ON cash_movements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear movimientos de caja"
  ON cash_movements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar movimientos de caja"
  ON cash_movements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar movimientos de caja"
  ON cash_movements FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
