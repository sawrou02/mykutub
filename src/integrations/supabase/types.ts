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
      books: {
        Row: {
          can_deliver: boolean
          category: string
          city: string
          condition: string
          created_at: string
          description: string | null
          id: string
          image_url: string
          is_donation: boolean
          price: number
          seller_id: string
          seller_name: string
          title: string
        }
        Insert: {
          can_deliver?: boolean
          category: string
          city: string
          condition: string
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          is_donation?: boolean
          price?: number
          seller_id: string
          seller_name: string
          title: string
        }
        Update: {
          can_deliver?: boolean
          category?: string
          city?: string
          condition?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          is_donation?: boolean
          price?: number
          seller_id?: string
          seller_name?: string
          title?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          book_id: string | null
          book_image_url: string | null
          book_title: string | null
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
          participants: string[]
          unread_by: string[] | null
        }
        Insert: {
          book_id?: string | null
          book_image_url?: string | null
          book_title?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participants: string[]
          unread_by?: string[] | null
        }
        Update: {
          book_id?: string | null
          book_image_url?: string | null
          book_title?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          participants?: string[]
          unread_by?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          book_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          sender_id: string
          sender_name: string
          text: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          sender_id: string
          sender_name: string
          text: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          sender_id?: string
          sender_name?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          notify_email: boolean
          notify_push: boolean
          notify_sms: boolean
          phone: string | null
          phone_visible: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          notify_email?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          phone?: string | null
          phone_visible?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notify_email?: boolean
          notify_push?: boolean
          notify_sms?: boolean
          phone?: string | null
          phone_visible?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          chat_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer_id: string
          reviewer_name: string
          seller_id: string
        }
        Insert: {
          chat_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer_id: string
          reviewer_name: string
          seller_id: string
        }
        Update: {
          chat_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer_id?: string
          reviewer_name?: string
          seller_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          user_id?: string
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
      app_role: ["admin", "user"],
    },
  },
} as const
