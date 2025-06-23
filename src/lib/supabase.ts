import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          code: string
          title: string
          created_at: string
          active: boolean
        }
        Insert: {
          id?: string
          code: string
          title: string
          created_at?: string
          active?: boolean
        }
        Update: {
          id?: string
          code?: string
          title?: string
          created_at?: string
          active?: boolean
        }
      }
      tasks: {
        Row: {
          id: string
          session_id: string
          title: string
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          title: string
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          title?: string
          order_index?: number
          created_at?: string
        }
      }
      participants: {
        Row: {
          id: string
          session_id: string
          name: string
          last_seen: string
          created_at: string
          is_online: boolean
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          last_seen?: string
          created_at?: string
          is_online?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          last_seen?: string
          created_at?: string
          is_online?: boolean
        }
      }
      progress: {
        Row: {
          id: string
          participant_id: string
          task_id: string
          completed: boolean
          updated_at: string
        }
        Insert: {
          id?: string
          participant_id: string
          task_id: string
          completed?: boolean
          updated_at?: string
        }
        Update: {
          id?: string
          participant_id?: string
          task_id?: string
          completed?: boolean
          updated_at?: string
        }
      }
    }
  }
}