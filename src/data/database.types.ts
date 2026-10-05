export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      cron_runs: {
        Row: {
          finished_at: string | null
          id: string
          items_found: number
          items_kept: number
          org_id: string
          schedule_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["cron_run_status"]
        }
        Insert: {
          finished_at?: string | null
          id?: string
          items_found?: number
          items_kept?: number
          org_id: string
          schedule_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["cron_run_status"]
        }
        Update: {
          finished_at?: string | null
          id?: string
          items_found?: number
          items_kept?: number
          org_id?: string
          schedule_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["cron_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cron_runs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cron_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "cron_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_schedules: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          org_id: string
          run_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id: string
          run_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          org_id?: string
          run_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cron_schedules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_items: {
        Row: {
          category: Database["public"]["Enums"]["feed_category"]
          content: string | null
          created_at: string
          id: string
          materiality: Database["public"]["Enums"]["materiality"]
          org_id: string
          outlet_url: string | null
          published_at: string
          run_id: string | null
          screened: boolean
          screened_reason: string | null
          source_id: string | null
          summary: string | null
          tick: string | null
          title: string
          url: string
          why_it_matters: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["feed_category"]
          content?: string | null
          created_at?: string
          id?: string
          materiality: Database["public"]["Enums"]["materiality"]
          org_id: string
          outlet_url?: string | null
          published_at: string
          run_id?: string | null
          screened?: boolean
          screened_reason?: string | null
          source_id?: string | null
          summary?: string | null
          tick?: string | null
          title: string
          url: string
          why_it_matters?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["feed_category"]
          content?: string | null
          created_at?: string
          id?: string
          materiality?: Database["public"]["Enums"]["materiality"]
          org_id?: string
          outlet_url?: string | null
          published_at?: string
          run_id?: string | null
          screened?: boolean
          screened_reason?: string | null
          source_id?: string | null
          summary?: string | null
          tick?: string | null
          title?: string
          url?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "cron_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      materiality_guidelines: {
        Row: {
          content: string
          level: Database["public"]["Enums"]["materiality"]
          org_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          level: Database["public"]["Enums"]["materiality"]
          org_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          level?: Database["public"]["Enums"]["materiality"]
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materiality_guidelines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      noise_rules: {
        Row: {
          exclude_domains: string[]
          exclude_terms: string[]
          max_lookback_hours: number | null
          min_materiality: Database["public"]["Enums"]["materiality"]
          org_id: string
          updated_at: string
        }
        Insert: {
          exclude_domains?: string[]
          exclude_terms?: string[]
          max_lookback_hours?: number | null
          min_materiality?: Database["public"]["Enums"]["materiality"]
          org_id: string
          updated_at?: string
        }
        Update: {
          exclude_domains?: string[]
          exclude_terms?: string[]
          max_lookback_hours?: number | null
          min_materiality?: Database["public"]["Enums"]["materiality"]
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "noise_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          name: string | null
          org_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          name?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          name?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          org_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          org_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          id: string
          name: string
          org_id: string
          tick: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          org_id: string
          tick?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          tick?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sources_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { _name: string; _owner_email?: string; _slug?: string }
        Returns: string
      }
      is_org_admin: { Args: { _org: string }; Returns: boolean }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      slugify: { Args: { _text: string }; Returns: string }
    }
    Enums: {
      cron_run_status: "running" | "success" | "error"
      feed_category: "Earnings" | "Product" | "M&A" | "Regulation" | "Market"
      materiality: "material" | "potentially" | "noteworthy"
      member_role: "owner" | "admin" | "member"
      member_status: "active" | "pending"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cron_run_status: ["running", "success", "error"],
      feed_category: ["Earnings", "Product", "M&A", "Regulation", "Market"],
      materiality: ["material", "potentially", "noteworthy"],
      member_role: ["owner", "admin", "member"],
      member_status: ["active", "pending"],
    },
  },
} as const

