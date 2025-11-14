/**
 * Supabase Database Types for DEGN.gg
 * 
 * To regenerate these types:
 * 1. Install Supabase CLI: npm install -g supabase
 * 2. Login: supabase login
 * 3. Generate types: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts
 * 
 * Replace YOUR_PROJECT_ID with your actual Supabase project ID from the dashboard URL
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      entries: {
        Row: {
          id: string
          lobby_id: string
          wallet: string
          paid: boolean | null
          transaction_signature: string | null
          amount_sol: number | null
          entry_amount: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lobby_id: string
          wallet: string
          paid?: boolean | null
          transaction_signature?: string | null
          amount_sol?: number | null
          entry_amount?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lobby_id?: string
          wallet?: string
          paid?: boolean | null
          transaction_signature?: string | null
          amount_sol?: number | null
          entry_amount?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_entries_lobby_id"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          }
        ]
      }
      lobbies: {
        Row: {
          id: string
          game_type: string
          max_players: number
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          game_type: string
          max_players?: number
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          game_type?: string
          max_players?: number
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          lobby_id: string
          winner_wallet: string | null
          pot_amount: number | null
          game_duration: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lobby_id: string
          winner_wallet?: string | null
          pot_amount?: number | null
          game_duration?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lobby_id?: string
          winner_wallet?: string | null
          pot_amount?: number | null
          game_duration?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_matches_lobby_id"
            columns: ["lobby_id"]
            isOneToOne: false
            referencedRelation: "lobbies"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          lobby_id: string
          player_address: string
          transaction_signature: string
          amount_sol: number
          entry_amount: number
          status: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          lobby_id: string
          player_address: string
          transaction_signature: string
          amount_sol: number
          entry_amount: number
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          lobby_id?: string
          player_address?: string
          transaction_signature?: string
          amount_sol?: number
          entry_amount?: number
          status?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          created_at?: string | null
          updated_at?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table types
export type Profile = Tables<'profiles'>
export type Lobby = Tables<'lobbies'>
export type Entry = Tables<'entries'>
export type Match = Tables<'matches'>
export type Payment = Tables<'payments'>

// Insert types
export type ProfileInsert = Inserts<'profiles'>
export type LobbyInsert = Inserts<'lobbies'>
export type EntryInsert = Inserts<'entries'>
export type MatchInsert = Inserts<'matches'>
export type PaymentInsert = Inserts<'payments'>

// Update types
export type ProfileUpdate = Updates<'profiles'>
export type LobbyUpdate = Updates<'lobbies'>
export type EntryUpdate = Updates<'entries'>
export type MatchUpdate = Updates<'matches'>
export type PaymentUpdate = Updates<'payments'>

// Enum types
export type LobbyStatus = 'waiting' | 'ready' | 'in-progress' | 'completed'
export type GameType = 'sol-bird' | 'coinflip' | 'connect4' | 'slither' | 'agar'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'
