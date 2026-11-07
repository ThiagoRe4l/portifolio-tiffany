export type AppEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

type EnvSource = Record<string, unknown>;

function required(source: EnvSource, name: string): string {
  const value = source[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Variável de ambiente ausente: ${name}`);
  }
  return value.trim();
}

/**
 * Lê as variáveis públicas do Supabase. Chamada sob demanda (não no carregamento
 * do módulo), para o build e o site público não dependerem delas.
 */
export function getEnv(source: EnvSource = import.meta.env): AppEnv {
  // A chave service_role dá acesso total ao banco: nunca pode chegar ao navegador.
  const leaked = Object.keys(source).find((key) => /service_?role/i.test(key));
  if (leaked) {
    throw new Error(`${leaked}: a chave service_role nunca pode ser usada no frontend`);
  }

  const supabaseUrl = required(source, 'VITE_SUPABASE_URL');
  if (!URL.canParse(supabaseUrl)) {
    throw new Error('VITE_SUPABASE_URL inválida');
  }

  return {
    supabaseUrl,
    supabaseAnonKey: required(source, 'VITE_SUPABASE_ANON_KEY'),
  };
}
