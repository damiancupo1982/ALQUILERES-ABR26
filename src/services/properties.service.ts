import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type PropertyRow = Database['public']['Tables']['properties']['Row'];
type PropertyInsert = Database['public']['Tables']['properties']['Insert'];
type PropertyUpdate = Database['public']['Tables']['properties']['Update'];

export const propertiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PropertyRow[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as PropertyRow | null;
  },

  async create(property: PropertyInsert) {
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();

    if (error) throw error;
    return data as PropertyRow;
  },

  async update(id: string, property: PropertyUpdate) {
    const { data, error } = await supabase
      .from('properties')
      .update(property)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PropertyRow;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateTenantAssignment(propertyId: string, tenantName: string | null) {
    const status = tenantName ? 'ocupado' : 'disponible';
    return this.update(propertyId, {
      tenant_name: tenantName,
      status: status as any
    });
  }
};
