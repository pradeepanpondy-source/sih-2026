import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase configuration
// In production, these should come from .env file
const defaultSupabaseUrl = 'https://uigjzcwdyfulrmmeyeys.supabase.co';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZ2p6Y3dkeWZ1bHJtbWV5ZXlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MzUyNDYsImV4cCI6MjA3ODExMTI0Nn0.nwpTzz450fNh6vQRCpRX0dV0XqBxcOjny6eUkYQiYEA';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultAnonKey;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'beebridge_auth_token',
    }
  }
)

export default supabase
