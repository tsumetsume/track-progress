import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Configure Supabase client with improved WebSocket connection settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 5 // Reduce events per second to avoid rate limiting
    },
    timeout: 10000, // Reduce timeout to 10 seconds to fail faster and retry
    heartbeatIntervalMs: 3000, // More frequent heartbeats
    reconnectAfterMs: (retryCount: number) => {
      // More aggressive reconnection attempts
      return [500, 1000, 2000, 3000, 5000][retryCount] || 10000
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js/2.x'
    },
    fetch: async (url, options) => {
      // Custom fetch implementation with retry logic
      const MAX_RETRIES = 3;
      let error = null;
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          return await fetch(url, options);
        } catch (err) {
          error = err;
          console.warn(`Fetch attempt ${i + 1} failed, retrying...`, err);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }
      
      throw error;
    }
  }
})

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