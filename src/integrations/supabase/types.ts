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
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      daily_candles: {
        Row: {
          close: number | null
          date: string
          high: number | null
          low: number | null
          open: number | null
          ticker: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          date: string
          high?: number | null
          low?: number | null
          open?: number | null
          ticker: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          date?: string
          high?: number | null
          low?: number | null
          open?: number | null
          ticker?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_candles_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["ticker"]
          },
        ]
      }
      monthly_candles: {
        Row: {
          close: number | null
          ema20: number | null
          high: number | null
          low: number | null
          month_end_date: string
          open: number | null
          ticker: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          ema20?: number | null
          high?: number | null
          low?: number | null
          month_end_date: string
          open?: number | null
          ticker: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          ema20?: number | null
          high?: number | null
          low?: number | null
          month_end_date?: string
          open?: number | null
          ticker?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_candles_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["ticker"]
          },
        ]
      }
      run_logs: {
        Row: {
          error: string | null
          failed_tickers: string[]
          finished_at: string | null
          id: string
          job_name: string
          rows_written: number
          started_at: string
          status: string
        }
        Insert: {
          error?: string | null
          failed_tickers?: string[]
          finished_at?: string | null
          id?: string
          job_name: string
          rows_written?: number
          started_at?: string
          status?: string
        }
        Update: {
          error?: string | null
          failed_tickers?: string[]
          finished_at?: string | null
          id?: string
          job_name?: string
          rows_written?: number
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      screener_configs: {
        Row: {
          enabled: boolean
          label: string
          name: string
          params: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          label: string
          name: string
          params?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          label?: string
          name?: string
          params?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      screener_results: {
        Row: {
          created_at: string
          details: Json
          id: string
          screener_name: string
          ticker: string
          trigger_date: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          screener_name: string
          ticker: string
          trigger_date: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          screener_name?: string
          ticker?: string
          trigger_date?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          active: boolean
          created_at: string
          exchange: string
          name: string
          sector: string
          subsector: string
          ticker: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          exchange?: string
          name: string
          sector?: string
          subsector?: string
          ticker: string
        }
        Update: {
          active?: boolean
          created_at?: string
          exchange?: string
          name?: string
          sector?: string
          subsector?: string
          ticker?: string
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
      watchlist: {
        Row: {
          added_at: string
          ticker: string
        }
        Insert: {
          added_at?: string
          ticker: string
        }
        Update: {
          added_at?: string
          ticker?: string
        }
        Relationships: []
      }
      weekly_candles: {
        Row: {
          close: number | null
          high: number | null
          low: number | null
          open: number | null
          ticker: string
          volume: number | null
          week_end_date: string
        }
        Insert: {
          close?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          ticker: string
          volume?: number | null
          week_end_date: string
        }
        Update: {
          close?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          ticker?: string
          volume?: number | null
          week_end_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_candles_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["ticker"]
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
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
    },
  },
} as const
