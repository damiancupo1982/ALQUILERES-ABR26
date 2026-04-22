import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];

export const receiptsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ReceiptRow[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as ReceiptRow | null;
  },

  async getByYear(year: number) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('year', year)
      .order('created_date', { ascending: false });

    if (error) throw error;
    return data as ReceiptRow[];
  },

  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('status', status)
      .order('created_date', { ascending: false });

    if (error) throw error;
    return data as ReceiptRow[];
  },

  async create(receipt: ReceiptInsert) {
    const { data, error } = await supabase
      .from('receipts')
      .insert(receipt)
      .select()
      .single();

    if (error) throw error;
    return data as ReceiptRow;
  },

  async update(id: string, receipt: ReceiptUpdate) {
    const { data, error } = await supabase
      .from('receipts')
      .update(receipt)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ReceiptRow;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
