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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      members: {
        Row: {
          area: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          joined_date: string
          member_code: string
          monthly_rate: number
          phone: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_code: string
          monthly_rate?: number
          phone?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          joined_date?: string
          member_code?: string
          monthly_rate?: number
          phone?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          for_month: number
          for_year: number
          id: string
          member_id: string
          method: string
          note: string | null
          payment_date: string
          recorded_by: string | null
          status: string
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          for_month: number
          for_year: number
          id?: string
          member_id: string
          method: string
          note?: string | null
          payment_date: string
          recorded_by?: string | null
          status?: string
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          for_month?: number
          for_year?: number
          id?: string
          member_id?: string
          method?: string
          note?: string | null
          payment_date?: string
          recorded_by?: string | null
          status?: string
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
          expense_date: string
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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
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
        }
        Insert: {
          created_at?: string
          for_month: number
          for_year: number
          id?: string
          note?: string | null
          target_amount: number
        }
        Update: {
          created_at?: string
          for_month?: number
          for_year?: number
          id?: string
          note?: string | null
          target_amount?: number
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      committee_comments: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      committee_notices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      committee_members: {
        Row: {
          created_at: string
          designation: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          designation: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          designation?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      committee_member_auth: {
        Row: {
          member_id: string
          pin_hash: string
        }
        Insert: {
          member_id: string
          pin_hash: string
        }
        Update: {
          member_id?: string
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_member_auth_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "committee_members"
            referencedColumns: ["id"]
          }
        ]
      }
      committee_contributions: {
        Row: {
          amount: number
          area: string | null
          created_at: string
          id: string
          name: string
          note: string | null
          payment_method: string | null
          target_month: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          area?: string | null
          created_at?: string
          id?: string
          name: string
          note?: string | null
          payment_method?: string | null
          target_month: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          area?: string | null
          created_at?: string
          id?: string
          name?: string
          note?: string | null
          payment_method?: string | null
          target_month?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      finances: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          type: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donation_category: string
          donor_name: string
          donor_phone: string
          id: string
          payment_method: string
          recipient_id: string | null
          status: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          donation_category: string
          donor_name: string
          donor_phone: string
          id?: string
          payment_method: string
          recipient_id?: string | null
          status?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_category?: string
          donor_name?: string
          donor_phone?: string
          id?: string
          payment_method?: string
          recipient_id?: string | null
          status?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      gallery: {
        Row: {
          caption: string | null
          category: string | null
          created_at: string
          id: string
          url: string
        }
        Insert: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          url: string
        }
        Update: {
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          url?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          address: string | null
          created_at: string
          details: string
          id: string
          is_read: boolean
          name: string
          phone: string | null
          replied_at: string | null
          reply: string | null
          subject: string
          type: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          details: string
          id?: string
          is_read?: boolean
          name: string
          phone?: string | null
          replied_at?: string | null
          reply?: string | null
          subject: string
          type: string
        }
        Update: {
          address?: string | null
          created_at?: string
          details?: string
          id?: string
          is_read?: boolean
          name?: string
          phone?: string | null
          replied_at?: string | null
          reply?: string | null
          subject?: string
          type?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vote_topics: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          title?: string
          type?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          topic_id: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic_id: string
          user_id: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          topic_id?: string
          user_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "vote_topics"
            referencedColumns: ["id"]
          },
        ]
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
      verify_committee_member: {
        Args: {
          p_phone_variants: string[]
          p_pin_hash: string
        }
        Returns: {
          id: string
          name: string
          designation: string
          is_new_pin: boolean
          success: boolean
        }[]
      }
      has_pin: {
        Args: {
          m: Database["public"]["Tables"]["committee_members"]["Row"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
