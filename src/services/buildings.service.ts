import { supabase } from '../lib/supabase';

export interface Building {
  id: string;
  name: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface BuildingInsert {
  name: string;
  address?: string;
  notes?: string;
}

export interface BuildingUpdate {
  name?: string;
  address?: string;
  notes?: string;
}

export const buildingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Building[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Building | null;
  },

  async getByName(name: string) {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data as Building | null;
  },

  async create(building: BuildingInsert) {
    const { data, error } = await supabase
      .from('buildings')
      .insert(building)
      .select()
      .single();

    if (error) throw error;
    return data as Building;
  },

  async update(id: string, building: BuildingUpdate) {
    const { data, error } = await supabase
      .from('buildings')
      .update(building)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Building;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('buildings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
