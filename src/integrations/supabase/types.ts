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
      admin_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id: string
          payment_status: string
          paystack_reference: string | null
          points_awarded: boolean
          points_redeemed: number
          product_id: string | null
          product_title: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
          payment_method: string
          bank_transfer_reference: string | null
        }
        Insert: {
          created_at?: string
          customer_address: string
          customer_name: string
          customer_phone: string
          id?: string
          payment_status?: string
          paystack_reference?: string | null
          points_awarded?: boolean
          points_redeemed?: number
          product_id?: string | null
          product_title: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          payment_method?: string
          bank_transfer_reference?: string | null
        }
        Update: {
          created_at?: string
          customer_address?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          payment_status?: string
          paystack_reference?: string | null
          points_awarded?: boolean
          points_redeemed?: number
          product_id?: string | null
          product_title?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          payment_method?: string
          bank_transfer_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          points: number
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          colors: Json
          cost_price: number
          created_at: string
          description: string | null
          id: string
          images: Json
          published: boolean
          selling_price: number
          shipping_fee: number
          sizes: Json
          source: string
          source_url: string | null
          stock: number
          title: string
          updated_at: string
          collection_id: string | null
          shipping_origin: string | null
          shipping_min_days: number | null
          shipping_max_days: number | null
          shipping_cost_min: number
          shipping_cost_max: number
        }
        Insert: {
          colors?: Json
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          published?: boolean
          selling_price?: number
          shipping_fee?: number
          sizes?: Json
          source?: string
          source_url?: string | null
          stock?: number
          title: string
          updated_at?: string
          collection_id?: string | null
          shipping_origin?: string | null
          shipping_min_days?: number | null
          shipping_max_days?: number | null
          shipping_cost_min?: number
          shipping_cost_max?: number
        }
        Update: {
          colors?: Json
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          images?: Json
          published?: boolean
          selling_price?: number
          shipping_fee?: number
          sizes?: Json
          source?: string
          source_url?: string | null
          stock?: number
          title?: string
          updated_at?: string
          collection_id?: string | null
          shipping_origin?: string | null
          shipping_min_days?: number | null
          shipping_max_days?: number | null
          shipping_cost_min?: number
          shipping_cost_max?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          points_balance: number
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          points_balance?: number
          referral_code: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          points_balance?: number
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          banner_url: string | null
          default_shipping_fee: number
          id: string
          logo_url: string | null
          profit_multiplier: number
          store_name: string
          updated_at: string
          whatsapp_number: string | null
          bank_name: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_sort_code: string | null
          bank_transfer_instructions: string | null
        }
        Insert: {
          banner_url?: string | null
          default_shipping_fee?: number
          id?: string
          logo_url?: string | null
          profit_multiplier?: number
          store_name?: string
          updated_at?: string
          whatsapp_number?: string | null
          bank_name?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          bank_transfer_instructions?: string | null
        }
        Update: {
          banner_url?: string | null
          default_shipping_fee?: number
          id?: string
          logo_url?: string | null
          profit_multiplier?: number
          store_name?: string
          updated_at?: string
          whatsapp_number?: string | null
          bank_name?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          bank_transfer_instructions?: string | null
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
      collections: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          image_url: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          image_url?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_color_tags: {
        Row: {
          id: string
          product_id: string
          image_index: number
          color_name: string
          color_code: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_index: number
          color_name: string
          color_code: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_index?: number
          color_name?: string
          color_code?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_color_tags_product_id_fkey"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_referral: { Args: { _code: string }; Returns: string }
      claim_first_admin: { Args: never; Returns: boolean }
      claim_my_invites: { Args: never; Returns: number }
      generate_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      settle_paid_order: { Args: { _order_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user" | "support_manager" | "delivery_support"
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
      app_role: ["admin", "user", "support_manager", "delivery_support"],
    },
  },
} as const
