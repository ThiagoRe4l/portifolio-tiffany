import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from './env';

let client: SupabaseClient | undefined;

/**
 * Cliente único do Supabase, criado na primeira chamada. Usado só pelo admin: o
 * visitante do site nunca baixa o SDK (`npm run size` falha se isso mudar).
 *
 * `implicit`: o PKCE exigiria abrir o link de recuperação no mesmo navegador do pedido.
 * `detectSessionInUrl: false`: o link é tratado à mão, para o token sair do histórico.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const { supabaseUrl, supabaseAnonKey } = getEnv();
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'implicit',
      storageKey: 'admin-auth',
    },
  });
  return client;
}
