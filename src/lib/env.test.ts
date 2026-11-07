import { describe, expect, it } from 'vitest';
import { getEnv } from './env';

// RF-11 / CA-11: leitura tipada das variáveis públicas do Supabase.

const VALID = {
  VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'chave-publica-de-teste',
};

describe('getEnv', () => {
  it('devolve as variáveis tipadas quando estão presentes', () => {
    expect(getEnv(VALID)).toEqual({
      supabaseUrl: 'https://exemplo.supabase.co',
      supabaseAnonKey: 'chave-publica-de-teste',
    });
  });

  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const)(
    'lança erro com o nome de %s quando ausente',
    (name) => {
      const source: Record<string, string | undefined> = { ...VALID };
      delete source[name];

      expect(() => getEnv(source)).toThrow(`Variável de ambiente ausente: ${name}`);
    },
  );

  it.each(['', '   '])('trata valor vazio (%j) como ausente', (empty) => {
    expect(() => getEnv({ ...VALID, VITE_SUPABASE_URL: empty })).toThrow(
      'Variável de ambiente ausente: VITE_SUPABASE_URL',
    );
  });

  it('rejeita URL inválida', () => {
    expect(() => getEnv({ ...VALID, VITE_SUPABASE_URL: 'nao-e-url' })).toThrow(
      'VITE_SUPABASE_URL inválida',
    );
  });

  it('nunca aceita a chave service_role no frontend', () => {
    expect(() => getEnv({ ...VALID, VITE_SUPABASE_SERVICE_ROLE_KEY: 'segredo' })).toThrow(
      'service_role',
    );
  });
});
