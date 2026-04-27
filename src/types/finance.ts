export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string;
  monthly_rate: number;
  joined_date: string;
  is_active: boolean;
  area?: string;
  address?: string;
  [key: string]: unknown;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number | string;
  for_month: number;
  for_year: number;
  payment_date: string;
  method?: string;
  transaction_ref?: string;
  status?: string;
  created_at?: string;
  created_by?: string;
  members?: {
    full_name: string;
    member_code: string;
  };
}

export interface Expense {
  id: string;
  title: string;
  amount: number | string;
  category?: string;
  expense_date: string;
  description?: string;
  note?: string;
  approved_by?: string;
  created_at?: string;
  created_by?: string;
}

export type Role = 'admin' | 'treasurer' | 'member';
