import { createClient } from '@supabase/supabase-js';

// Fallback direto com as credenciais públicas do projeto no Supabase
// Isso garante que mesmo se as variáveis de ambiente na Vercel não forem inseridas,
// a aplicação SEMPRE se conecta ao mesmo banco na nuvem para todos os usuários.
const DEFAULT_URL = 'https://zefzpdlrgpnpsoyoyieo.supabase.co';
const DEFAULT_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnpwZGxyZ3BucHNveW95aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDcxMTIsImV4cCI6MjEwNTg4MzExMn0._bMUZlmbrRoRDl4OI1zJk7pbgRkrPNuCPyzuTNHzGnQ';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
