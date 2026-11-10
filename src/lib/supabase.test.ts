import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Spec 003, T01 (D1) — cliente único do Supabase, criado sob demanda.

const createClient = vi.hoisted(() => vi.fn(() => ({ marker: 'cliente' })));

vi.mock('@supabase/supabase-js', () => ({ createClient }));

const URL_OK = 'https://test.supabase.co';
const KEY_OK = 'chave-publica-de-teste';

async function load() {
  vi.resetModules();
  return import('./supabase');
}

beforeEach(() => {
  createClient.mockClear();
  vi.stubEnv('VITE_SUPABASE_URL', URL_OK);
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', KEY_OK);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getSupabase', () => {
  it('não cria o cliente só por importar o módulo', async () => {
    await load();

    expect(createClient).not.toHaveBeenCalled();
  });

  it('cria o cliente com a URL, a chave pública e as opções de sessão do plano', async () => {
    const { getSupabase } = await load();

    getSupabase();

    expect(createClient).toHaveBeenCalledExactlyOnceWith(URL_OK, KEY_OK, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        storageKey: 'admin-auth',
      },
    });
  });

  it('devolve sempre o mesmo cliente', async () => {
    const { getSupabase } = await load();

    expect(getSupabase()).toBe(getSupabase());
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])(
    'sem %s, falha com erro claro e não cria o cliente',
    async (name) => {
      vi.stubEnv(name, '');
      const { getSupabase } = await load();

      expect(() => getSupabase()).toThrow(`Variável de ambiente ausente: ${name}`);
      expect(createClient).not.toHaveBeenCalled();
    },
  );

  it('recusa rodar se uma variável service_role chegou ao frontend', async () => {
    vi.stubEnv('VITE_SUPABASE_SERVICE_ROLE_KEY', 'segredo');
    const { getSupabase } = await load();

    expect(() => getSupabase()).toThrow(/service_role nunca pode ser usada/);
    expect(createClient).not.toHaveBeenCalled();
  });
});
