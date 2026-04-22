import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type CashMovementRow = Database['public']['Tables']['cash_movements']['Row'];
type CashMovementInsert = Database['public']['Tables']['cash_movements']['Insert'];

export const cashMovementsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data as CashMovementRow[];
  },

  async getByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as CashMovementRow[];
  },

  async getByType(type: 'income' | 'delivery') {
    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('type', type)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as CashMovementRow[];
  },

  async create(movement: CashMovementInsert) {
    const { data, error } = await supabase
      .from('cash_movements')
      .insert(movement)
      .select()
      .single();

    if (error) throw error;
    return data as CashMovementRow;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('cash_movements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
