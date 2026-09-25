import { createClient } from '@supabase/supabase-js';

// Decodifica com segurança o payload do JWT para extrair o ID do projeto Supabase caso a URL esteja ausente ou seja placeholder
function extractProjectRef(jwt: string): string | null {
  try {
    if (!jwt || typeof jwt !== 'string') return null;
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    return typeof parsed.ref === 'string' && parsed.ref.length > 0 ? parsed.ref : null;
  } catch {
    return null;
  }
}

// As credenciais são carregadas estritamente a partir do arquivo .env local ou das variáveis da Vercel
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Se a URL estiver ausente ou contiver placeholder, derivamos o endpoint oficial do Supabase dinamicamente da anon key
let resolvedUrl = rawUrl;
const extractedRef = extractProjectRef(rawKey);

if ((!resolvedUrl || resolvedUrl.includes('seu-id') || resolvedUrl.includes('placeholder')) && extractedRef) {
  resolvedUrl = `https://${extractedRef}.supabase.co`;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    resolvedUrl &&
    rawKey &&
    resolvedUrl.startsWith('https://') &&
    !resolvedUrl.includes('seu-id') &&
    !resolvedUrl.includes('placeholder') &&
    rawKey.split('.').length === 3
  );
};

// Cliente oficial do Supabase utilizando exclusivamente as variáveis de ambiente (.env / Vercel)
export const supabase = createClient(
  isSupabaseConfigured() ? resolvedUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? rawKey : 'placeholder',
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
