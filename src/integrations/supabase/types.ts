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
      attendance: {
        Row: {
          created_at: string
          date: string
          dinner_status: Database["public"]["Enums"]["attendance_status"]
          id: string
          lunch_status: Database["public"]["Enums"]["attendance_status"]
          member_id: string
          remarks: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          dinner_status?: Database["public"]["Enums"]["attendance_status"]
          id?: string
          lunch_status?: Database["public"]["Enums"]["attendance_status"]
          member_id: string
          remarks?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          dinner_status?: Database["public"]["Enums"]["attendance_status"]
          id?: string
          lunch_status?: Database["public"]["Enums"]["attendance_status"]
          member_id?: string
          remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          added_by: string
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          expense_date: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          title: string
          updated_at: string
        }
        Insert: {
          added_by?: string
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          title: string
          updated_at?: string
        }
        Update: {
          added_by?: string
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          available_qty: number
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          damaged_qty: number
          id: string
          min_qty: number
          missing_qty: number
          name: string
          subcategory: string | null
          total_qty: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          available_qty?: number
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          damaged_qty?: number
          id?: string
          min_qty?: number
          missing_qty?: number
          name: string
          subcategory?: string | null
          total_qty?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          available_qty?: number
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          damaged_qty?: number
          id?: string
          min_qty?: number
          missing_qty?: number
          name?: string
          subcategory?: string | null
          total_qty?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          occurred_at: string
          purpose: string | null
          quantity: number
          supplier: string | null
          total_cost: number | null
          used_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          occurred_at?: string
          purpose?: string | null
          quantity: number
          supplier?: string | null
          total_cost?: number | null
          used_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          occurred_at?: string
          purpose?: string | null
          quantity?: number
          supplier?: string | null
          total_cost?: number | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          id: string
          id_proof_number: string | null
          id_proof_type: string | null
          join_date: string
          meal_plan: Database["public"]["Enums"]["meal_plan"]
          member_code: string | null
          mobile: string
          name: string
          room_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          join_date?: string
          meal_plan?: Database["public"]["Enums"]["meal_plan"]
          member_code?: string | null
          mobile: string
          name: string
          room_number: string
        }
        Update: {
          created_at?: string
          id?: string
          id_proof_number?: string | null
          id_proof_type?: string | null
          join_date?: string
          meal_plan?: Database["public"]["Enums"]["meal_plan"]
          member_code?: string | null
          mobile?: string
          name?: string
          room_number?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          room_number: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          room_number: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          room_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      attendance_status: "present" | "absent" | "not_marked"
      expense_category:
        | "grocery"
        | "staff_salary"
        | "electricity_bill"
        | "water_bill"
        | "gas_cylinder"
        | "maintenance"
        | "cleaning"
        | "utensils"
        | "other"
      inventory_category: "food" | "utensil" | "asset"
      meal_plan: "lunch" | "dinner" | "both"
      movement_type: "stock_in" | "stock_out" | "damage" | "missing"
      payment_method: "cash" | "upi" | "bank_transfer" | "card"
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
      attendance_status: ["present", "absent", "not_marked"],
      expense_category: [
        "grocery",
        "staff_salary",
        "electricity_bill",
        "water_bill",
        "gas_cylinder",
        "maintenance",
        "cleaning",
        "utensils",
        "other",
      ],
      inventory_category: ["food", "utensil", "asset"],
      meal_plan: ["lunch", "dinner", "both"],
      movement_type: ["stock_in", "stock_out", "damage", "missing"],
      payment_method: ["cash", "upi", "bank_transfer", "card"],
    },
  },
} as const
