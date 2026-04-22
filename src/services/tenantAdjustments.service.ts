import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type TenantAdjustmentRow = Database['public']['Tables']['tenant_adjustments']['Row'];
type TenantAdjustmentInsert = Database['public']['Tables']['tenant_adjustments']['Insert'];

export const tenantAdjustmentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tenant_adjustments')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data as TenantAdjustmentRow[];
  },

  async getByTenantId(tenantId: string) {
    const { data, error } = await supabase
      .from('tenant_adjustments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as TenantAdjustmentRow[];
  },

  async create(adjustment: TenantAdjustmentInsert) {
    const { data, error } = await supabase
      .from('tenant_adjustments')
      .insert(adjustment)
      .select()
      .single();

    if (error) throw error;
    return data as TenantAdjustmentRow;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tenant_adjustments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
