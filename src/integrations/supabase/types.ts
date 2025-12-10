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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cash_register: {
        Row: {
          card_sales: number | null
          cash_sales: number | null
          closed_at: string | null
          closing_balance: number | null
          deposits: number | null
          id: string
          opened_at: string | null
          opening_balance: number
          pix_sales: number | null
          status: string | null
          user_id: string
          withdrawals: number | null
        }
        Insert: {
          card_sales?: number | null
          cash_sales?: number | null
          closed_at?: string | null
          closing_balance?: number | null
          deposits?: number | null
          id?: string
          opened_at?: string | null
          opening_balance: number
          pix_sales?: number | null
          status?: string | null
          user_id: string
          withdrawals?: number | null
        }
        Update: {
          card_sales?: number | null
          cash_sales?: number | null
          closed_at?: string | null
          closing_balance?: number | null
          deposits?: number | null
          id?: string
          opened_at?: string | null
          opening_balance?: number
          pix_sales?: number | null
          status?: string | null
          user_id?: string
          withdrawals?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          address_number: string | null
          certificate_password: string | null
          certificate_valid_until: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          environment: string | null
          id: string
          last_nfce_number: number | null
          last_nfe_number: number | null
          municipal_registration: string | null
          neighborhood: string | null
          nfce_series: number | null
          nfe_series: number | null
          phone: string | null
          pix_key: string | null
          state: string | null
          state_registration: string | null
          tax_regime: string | null
          trade_name: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_number?: string | null
          certificate_password?: string | null
          certificate_valid_until?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          environment?: string | null
          id?: string
          last_nfce_number?: number | null
          last_nfe_number?: number | null
          municipal_registration?: string | null
          neighborhood?: string | null
          nfce_series?: number | null
          nfe_series?: number | null
          phone?: string | null
          pix_key?: string | null
          state?: string | null
          state_registration?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_number?: string | null
          certificate_password?: string | null
          certificate_valid_until?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          environment?: string | null
          id?: string
          last_nfce_number?: number | null
          last_nfe_number?: number | null
          municipal_registration?: string | null
          neighborhood?: string | null
          nfce_series?: number | null
          nfe_series?: number | null
          phone?: string | null
          pix_key?: string | null
          state?: string | null
          state_registration?: string | null
          tax_regime?: string | null
          trade_name?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          cpf: string | null
          created_at: string | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          phone: string | null
          total_purchases: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          cpf?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          phone?: string | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      discounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_purchase: number | null
          name: string
          type: string
          usage_count: number | null
          usage_limit: number | null
          user_id: string
          valid_from: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          name: string
          type?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_purchase?: number | null
          name?: string
          type?: string
          usage_count?: number | null
          usage_limit?: number | null
          user_id?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          paid_date: string | null
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          paid_date?: string | null
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          cest_code: string | null
          cfop: string | null
          cofins_cst: string | null
          cofins_rate: number | null
          created_at: string | null
          discount: number | null
          icms_cst: string | null
          icms_origin: string | null
          icms_rate: number | null
          id: string
          invoice_id: string
          ncm_code: string | null
          pis_cst: string | null
          pis_rate: number | null
          product_code: string | null
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit: string | null
          unit_price: number
        }
        Insert: {
          cest_code?: string | null
          cfop?: string | null
          cofins_cst?: string | null
          cofins_rate?: number | null
          created_at?: string | null
          discount?: number | null
          icms_cst?: string | null
          icms_origin?: string | null
          icms_rate?: number | null
          id?: string
          invoice_id: string
          ncm_code?: string | null
          pis_cst?: string | null
          pis_rate?: number | null
          product_code?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit?: string | null
          unit_price: number
        }
        Update: {
          cest_code?: string | null
          cfop?: string | null
          cofins_cst?: string | null
          cofins_rate?: number | null
          created_at?: string | null
          discount?: number | null
          icms_cst?: string | null
          icms_origin?: string | null
          icms_rate?: number | null
          id?: string
          invoice_id?: string
          ncm_code?: string | null
          pis_cst?: string | null
          pis_rate?: number | null
          product_code?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          access_key: string | null
          authorization_date: string | null
          cancellation_date: string | null
          cancellation_reason: string | null
          cfop: string | null
          cofins_value: number | null
          created_at: string | null
          customer_address: string | null
          customer_cnpj: string | null
          customer_cpf: string | null
          customer_name: string | null
          danfe_url: string | null
          icms_base: number | null
          icms_rate: number | null
          icms_value: number | null
          id: string
          invoice_number: number | null
          invoice_type: string
          ncm_code: string | null
          pis_value: number | null
          protocol_number: string | null
          qrcode_url: string | null
          sale_id: string | null
          series: number | null
          status: string | null
          total_discount: number | null
          total_invoice: number | null
          total_products: number | null
          updated_at: string | null
          user_id: string
          xml_content: string | null
        }
        Insert: {
          access_key?: string | null
          authorization_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cfop?: string | null
          cofins_value?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          danfe_url?: string | null
          icms_base?: number | null
          icms_rate?: number | null
          icms_value?: number | null
          id?: string
          invoice_number?: number | null
          invoice_type?: string
          ncm_code?: string | null
          pis_value?: number | null
          protocol_number?: string | null
          qrcode_url?: string | null
          sale_id?: string | null
          series?: number | null
          status?: string | null
          total_discount?: number | null
          total_invoice?: number | null
          total_products?: number | null
          updated_at?: string | null
          user_id: string
          xml_content?: string | null
        }
        Update: {
          access_key?: string | null
          authorization_date?: string | null
          cancellation_date?: string | null
          cancellation_reason?: string | null
          cfop?: string | null
          cofins_value?: number | null
          created_at?: string | null
          customer_address?: string | null
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_name?: string | null
          danfe_url?: string | null
          icms_base?: number | null
          icms_rate?: number | null
          icms_value?: number | null
          id?: string
          invoice_number?: number | null
          invoice_type?: string
          ncm_code?: string | null
          pis_value?: number | null
          protocol_number?: string | null
          qrcode_url?: string | null
          sale_id?: string | null
          series?: number | null
          status?: string | null
          total_discount?: number | null
          total_invoice?: number | null
          total_products?: number | null
          updated_at?: string | null
          user_id?: string
          xml_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cest_code: string | null
          cfop: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          min_stock: number | null
          name: string
          ncm_code: string | null
          sale_price: number | null
          stock_quantity: number | null
          unit: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cest_code?: string | null
          cfop?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name: string
          ncm_code?: string | null
          sale_price?: number | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cest_code?: string | null
          cfop?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          min_stock?: number | null
          name?: string
          ncm_code?: string | null
          sale_price?: number | null
          stock_quantity?: number | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_id: string | null
          discount: number | null
          id: string
          notes: string | null
          payment_method: string
          status: string | null
          total: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          payment_method: string
          status?: string | null
          total: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          discount?: number | null
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string | null
          total?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          movement_type: string
          new_stock: number
          previous_stock: number
          product_id: string
          quantity: number
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          movement_type?: string
          new_stock?: number
          previous_stock?: number
          product_id?: string
          quantity?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
    }
    Enums: {
      app_role: "admin" | "user" | "reseller"
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
      app_role: ["admin", "user", "reseller"],
    },
  },
} as const
