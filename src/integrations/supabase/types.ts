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
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      book_requests: {
        Row: {
          book_id: string
          created_at: string
          id: string
          requester_id: string
          requester_name: string
          status: string
        }
        Insert: {
          book_id: string
          created_at?: string
          id?: string
          requester_id: string
          requester_name: string
          status?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          requester_name?: string
          status?: string
        }
        Relationships: []
      }
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
          language: string
          price: number
          reserved_at: string | null
          reserved_by: string | null
          seller_id: string
          seller_name: string
          status: string
          title: string
          updated_at: string
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
          language?: string
          price?: number
          reserved_at?: string | null
          reserved_by?: string | null
          seller_id: string
          seller_name: string
          status?: string
          title: string
          updated_at?: string
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
          language?: string
          price?: number
          reserved_at?: string | null
          reserved_by?: string | null
          seller_id?: string
          seller_name?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          archived_for: string[]
          book_id: string | null
          book_image_url: string | null
          book_title: string | null
          created_at: string
          deleted_for: string[]
          id: string
          last_message: string | null
          last_message_at: string | null
          muted_for: string[]
          participants: string[]
          unread_by: string[] | null
        }
        Insert: {
          archived_for?: string[]
          book_id?: string | null
          book_image_url?: string | null
          book_title?: string | null
          created_at?: string
          deleted_for?: string[]
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          muted_for?: string[]
          participants: string[]
          unread_by?: string[] | null
        }
        Update: {
          archived_for?: string[]
          book_id?: string | null
          book_image_url?: string | null
          book_title?: string | null
          created_at?: string
          deleted_for?: string[]
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          muted_for?: string[]
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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
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
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          chat_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deleted_for_everyone: boolean
          hidden_for: string[]
          id: string
          read_at: string | null
          sender_id: string
          sender_name: string
          text: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean
          hidden_for?: string[]
          id?: string
          read_at?: string | null
          sender_id: string
          sender_name: string
          text: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deleted_for_everyone?: boolean
          hidden_for?: string[]
          id?: string
          read_at?: string | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          city: string | null
          created_at: string
          display_name: string | null
          id: string
          is_online: boolean
          last_seen: string
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
          is_online?: boolean
          last_seen?: string
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
          is_online?: boolean
          last_seen?: string
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
      reports: {
        Row: {
          book_id: string
          created_at: string
          description: string | null
          id: string
          raison: string
          reporter_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          description?: string | null
          id?: string
          raison: string
          reporter_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          description?: string | null
          id?: string
          raison?: string
          reporter_id?: string
          statut?: string
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
      is_blocked_by: {
        Args: { _blocked: string; _blocker: string }
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
