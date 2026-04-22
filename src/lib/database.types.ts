export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string;
          name: string;
          address: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string;
          notes?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          name: string;
          type: 'departamento' | 'galpon' | 'local' | 'oficina' | 'otro';
          building: string;
          address: string;
          rent: number;
          rent_currency: 'ARS' | 'USD';
          expenses: number;
          expenses_currency: 'ARS' | 'USD';
          next_update_date: string | null;
          tenant_name: string | null;
          status: 'ocupado' | 'disponible' | 'mantenimiento';
          contract_start: string | null;
          contract_end: string | null;
          last_updated: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: 'departamento' | 'galpon' | 'local' | 'oficina' | 'otro';
          building: string;
          address: string;
          rent?: number;
          rent_currency?: 'ARS' | 'USD';
          expenses?: number;
          expenses_currency?: 'ARS' | 'USD';
          next_update_date?: string | null;
          tenant_name?: string | null;
          status?: 'ocupado' | 'disponible' | 'mantenimiento';
          contract_start?: string | null;
          contract_end?: string | null;
          last_updated?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: 'departamento' | 'galpon' | 'local' | 'oficina' | 'otro';
          building?: string;
          address?: string;
          rent?: number;
          rent_currency?: 'ARS' | 'USD';
          expenses?: number;
          expenses_currency?: 'ARS' | 'USD';
          next_update_date?: string | null;
          tenant_name?: string | null;
          status?: 'ocupado' | 'disponible' | 'mantenimiento';
          contract_start?: string | null;
          contract_end?: string | null;
          last_updated?: string;
          notes?: string;
          updated_at?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string;
          property_id: string | null;
          contract_start: string;
          contract_end: string;
          deposit: number;
          guarantor_name: string;
          guarantor_email: string;
          guarantor_phone: string;
          balance: number;
          status: 'activo' | 'vencido' | 'pendiente';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone: string;
          property_id?: string | null;
          contract_start: string;
          contract_end: string;
          deposit?: number;
          guarantor_name: string;
          guarantor_email: string;
          guarantor_phone: string;
          balance?: number;
          status?: 'activo' | 'vencido' | 'pendiente';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          property_id?: string | null;
          contract_start?: string;
          contract_end?: string;
          deposit?: number;
          guarantor_name?: string;
          guarantor_email?: string;
          guarantor_phone?: string;
          balance?: number;
          status?: 'activo' | 'vencido' | 'pendiente';
          updated_at?: string;
        };
      };
      receipts: {
        Row: {
          id: string;
          receipt_number: string;
          tenant_id: string | null;
          tenant_name: string;
          property_name: string;
          building: string;
          month: string;
          year: number;
          rent: number;
          expenses: number;
          other_charges: Array<{ description: string; amount: number }>;
          previous_balance: number;
          total: number;
          paid_amount: number;
          remaining_balance: number;
          currency: 'ARS' | 'USD';
          payment_method: 'efectivo' | 'transferencia' | 'dolares';
          status: 'pagado' | 'pendiente' | 'vencido' | 'borrador';
          due_date: string;
          created_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          receipt_number: string;
          tenant_id?: string | null;
          tenant_name: string;
          property_name: string;
          building: string;
          month: string;
          year: number;
          rent?: number;
          expenses?: number;
          other_charges?: Array<{ description: string; amount: number }>;
          previous_balance?: number;
          total?: number;
          paid_amount?: number;
          remaining_balance?: number;
          currency?: 'ARS' | 'USD';
          payment_method?: 'efectivo' | 'transferencia' | 'dolares';
          status?: 'pagado' | 'pendiente' | 'vencido' | 'borrador';
          due_date: string;
          created_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          receipt_number?: string;
          tenant_id?: string | null;
          tenant_name?: string;
          property_name?: string;
          building?: string;
          month?: string;
          year?: number;
          rent?: number;
          expenses?: number;
          other_charges?: Array<{ description: string; amount: number }>;
          previous_balance?: number;
          total?: number;
          paid_amount?: number;
          remaining_balance?: number;
          currency?: 'ARS' | 'USD';
          payment_method?: 'efectivo' | 'transferencia' | 'dolares';
          status?: 'pagado' | 'pendiente' | 'vencido' | 'borrador';
          due_date?: string;
          created_date?: string;
          updated_at?: string;
        };
      };
      tenant_adjustments: {
        Row: {
          id: string;
          tenant_id: string | null;
          tenant_name: string;
          date: string;
          amount: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          tenant_name: string;
          date?: string;
          amount: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          tenant_name?: string;
          date?: string;
          amount?: number;
          reason?: string;
        };
      };
      cash_movements: {
        Row: {
          id: string;
          type: 'income' | 'delivery';
          description: string;
          amount: number;
          currency: 'ARS' | 'USD';
          date: string;
          tenant_name: string | null;
          property_name: string | null;
          payment_method: 'efectivo' | 'transferencia' | 'dolares' | null;
          delivery_type: 'propietario' | 'comision' | 'gasto' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: 'income' | 'delivery';
          description: string;
          amount?: number;
          currency?: 'ARS' | 'USD';
          date?: string;
          tenant_name?: string | null;
          property_name?: string | null;
          payment_method?: 'efectivo' | 'transferencia' | 'dolares' | null;
          delivery_type?: 'propietario' | 'comision' | 'gasto' | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: 'income' | 'delivery';
          description?: string;
          amount?: number;
          currency?: 'ARS' | 'USD';
          date?: string;
          tenant_name?: string | null;
          property_name?: string | null;
          payment_method?: 'efectivo' | 'transferencia' | 'dolares' | null;
          delivery_type?: 'propietario' | 'comision' | 'gasto' | null;
        };
      };
    };
  };
}
