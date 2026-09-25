import { createClient } from '@supabase/supabase-js';

// As credenciais são carregadas estritamente a partir do arquivo .env local ou das variáveis da Vercel
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('seu-id') &&
    !supabaseUrl.includes('placeholder')
  );
};

// Cliente oficial do Supabase utilizando exclusivamente as variáveis de ambiente
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
