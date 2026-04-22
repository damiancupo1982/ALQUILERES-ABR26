import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type TenantRow = Database['public']['Tables']['tenants']['Row'];
type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
type TenantUpdate = Database['public']['Tables']['tenants']['Update'];

export const tenantsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, properties:property_id(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as (TenantRow & { properties: any })[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*, properties:property_id(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(tenant: TenantInsert) {
    const { data, error } = await supabase
      .from('tenants')
      .insert(tenant)
      .select()
      .single();

    if (error) throw error;
    return data as TenantRow;
  },

  async update(id: string, tenant: TenantUpdate) {
    const { data, error } = await supabase
      .from('tenants')
      .update(tenant)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as TenantRow;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateBalance(id: string, balance: number) {
    return this.update(id, { balance });
  }
};
