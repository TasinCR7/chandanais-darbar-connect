import { supabase } from '@/integrations/supabase/client';
import type { Member, Payment, Expense } from '@/types/finance';

export interface MonthlyTarget {
  id: string;
  for_year: number;
  for_month: number;
  target_amount: number;
  note?: string;
  created_at?: string;
}

export const fetchMembers = async (): Promise<Member[]> => {
  const { data, error } = await supabase.from('members').select('*').order('member_code');
  if (error) throw error;
  return (data as Member[]) ?? [];
};

export const fetchPayments = async (): Promise<Payment[]> => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, members(full_name, member_code, area)')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data as Payment[]) ?? [];
};

export const fetchExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').order('expense_date', { ascending: false });
  if (error) throw error;
  return (data as Expense[]) ?? [];
};

export const fetchTargets = async (): Promise<MonthlyTarget[]> => {
  const { data, error } = await supabase
    .from('monthly_targets')
    .select('*')
    .order('for_year', { ascending: false })
    .order('for_month', { ascending: false });
  if (error) throw error;
  return (data as MonthlyTarget[]) ?? [];
};

export const fetchSettings = async (): Promise<Record<string, string>> => {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  const sObj: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => {
    sObj[row.key] = row.value;
  });
  return sObj;
};
