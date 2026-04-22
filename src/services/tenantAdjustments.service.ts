import { supabase } from '../lib/supabase';

export interface TenantAdjustmentRow {
  id: string;
  tenant_name: string;
  date: string;
  amount: number;
  reason: string;
  created_at: string;
}

export interface TenantAdjustmentInsert {
  tenant_name: string;
  date: string;
  amount: number;
  reason: string;
}

export const tenantAdjustmentsService = {
  async getAll(): Promise<TenantAdjustmentRow[]> {
    const { data, error } = await supabase
      .from('tenant_adjustments')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;
    return data as TenantAdjustmentRow[];
  },

  async create(adjustment: TenantAdjustmentInsert): Promise<TenantAdjustmentRow> {
    const { data, error } = await supabase
      .from('tenant_adjustments')
      .insert(adjustment)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAdjustmentRow;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tenant_adjustments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
