export interface Member {
  id: string;
  member_code: string;
  full_name: string;
  phone: string | null;
  monthly_rate: number;
  joined_date: string;
  is_active: boolean;
  area: string | null;
  address?: string;
}

export interface Payment {
  id: string;
  member_id: string;
  amount: number;
  for_month: number;
  for_year: number;
  payment_date: string;
  method: string;
  transaction_ref: string | null;
  status: string;
  note: string | null;
  recorded_by: string | null;
  created_at: string;
  members?: {
    full_name: string;
    member_code: string;
    area?: string | null;
    phone?: string | null;
  };
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string | null;
  expense_date: string;
  approved_by?: string | null;
  note: string | null;
  recorded_by?: string | null;
  created_at?: string;
  area?: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_id: string | null;
}

export interface MonthlyTarget {
  id: string;
  for_year: number;
  for_month: number;
  target_amount: number;
  note: string | null;
  created_at: string;
}

export type Role = 'admin' | 'treasurer' | 'member';
