export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          summary: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          summary?: string | null
          table_name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category: string | null
          created_at: string
          expense_date: string
          id: string
          note: string | null
          recorded_by: string | null
          title: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          title: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category?: string | null
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          recorded_by?: string | null
          title?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          area: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          joined_date: string
          member_code: string
          monthly_rate: number
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_code: string
          monthly_rate?: number
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_code?: string
          monthly_rate?: number
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_targets: {
        Row: {
          created_at: string
          for_month: number
          for_year: number
          id: string
          note: string | null
          target_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          for_month: number
          for_year: number
          id?: string
          note?: string | null
          target_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          for_month?: number
          for_year?: number
          id?: string
          note?: string | null
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          amount: number
          created_at: string
          for_month: number
          for_year: number
          id: string
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          payment_id: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sender_phone: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
          transaction_ref: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          for_month: number
          for_year: number
          id?: string
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          transaction_ref: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          for_month?: number
          for_year?: number
          id?: string
          member_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_id?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sender_phone?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          transaction_ref?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_submissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          for_month: number
          for_year: number
          id: string
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          payment_date: string
          recorded_by: string | null
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          for_month: number
          for_year: number
          id?: string
          member_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_date?: string
          recorded_by?: string | null
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          for_month?: number
          for_year?: number
          id?: string
          member_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          payment_date?: string
          recorded_by?: string | null
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "treasurer" | "member"
      payment_method: "bkash" | "nagad" | "rocket" | "bank" | "cash" | "other"
      submission_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "treasurer", "member"],
      payment_method: ["bkash", "nagad", "rocket", "bank", "cash", "other"],
      submission_status: ["pending", "approved", "rejected"],
    },
  },
} as const
