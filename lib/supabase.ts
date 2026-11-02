import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project-url') &&
    !supabaseUrl.includes('seu-projeto') &&
    !supabaseAnonKey.includes('placeholder') &&
    !supabaseAnonKey.includes('your-anon-key') &&
    !supabaseAnonKey.includes('sua-anon-key')
);

export const supabase = createClient(
  isSupabaseConfigured && supabaseUrl ? supabaseUrl : 'https://placeholder-url.supabase.co',
  isSupabaseConfigured && supabaseAnonKey ? supabaseAnonKey : 'placeholder-key'
);
