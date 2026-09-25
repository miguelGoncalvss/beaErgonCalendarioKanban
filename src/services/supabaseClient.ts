import { createClient } from '@supabase/supabase-js';

// Credenciais de produção do projeto Bea Ergon no Supabase
const PRODUCTION_SUPABASE_URL = 'https://zefzpdlrgpnpsoyoyieo.supabase.co';
const PRODUCTION_SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnpwZGxyZ3BucHNveW95aWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDcxMTIsImV4cCI6MjEwNTg4MzExMn0._bMUZlmbrRoRDl4OI1zJk7pbgRkrPNuCPyzuTNHzGnQ';

function getValidConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // Se o ambiente estiver vazio ou contiver placeholders/exemplos (como 'seu-id-de-projeto' ou 'placeholder')
  const isInvalidUrl = !envUrl || 
    envUrl.includes('seu-id') || 
    envUrl.includes('placeholder') || 
    envUrl.includes('example') || 
    !envUrl.startsWith('https://');

  const isInvalidKey = !envKey || 
    envKey.includes('sua-chave') || 
    envKey.includes('placeholder') || 
    envKey.length < 50;

  return {
    url: isInvalidUrl ? PRODUCTION_SUPABASE_URL : envUrl,
    key: isInvalidKey ? PRODUCTION_SUPABASE_ANON : envKey,
  };
}

const config = getValidConfig();
export const supabaseUrl = config.url;
export const supabaseAnonKey = config.key;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    !supabaseUrl.includes('seu-id') &&
    !supabaseUrl.includes('placeholder')
  );
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
