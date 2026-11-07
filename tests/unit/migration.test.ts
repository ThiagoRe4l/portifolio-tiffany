// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECTION_KEYS } from '@/content/schema';
import { fromRoot } from '../support/paths';

// T11 — migration da tabela site_content (spec 001, RF-18 / CA-18, parte local).
// Lê o SQL como texto. A prova real (leitura 200, escrita recusada) é feita com
// curl depois que o Thiago aplicar a migration no painel do Supabase.

const MIGRATION = 'supabase/migrations/20261106120000_site_content.sql';

/** SQL sem comentários, em minúsculas e com espaços normalizados. */
function readSql(): string {
  return readFileSync(fromRoot(MIGRATION), 'utf8')
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

function statements(): string[] {
  return readSql()
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

describe(`migration ${MIGRATION}`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(MIGRATION))).toBe(true);
  });

  it('cria a tabela com as 4 colunas do contrato', () => {
    const create = statements().find((s) => s.startsWith('create table public.site_content'));

    expect(create).toBeDefined();
    expect(create).toMatch(/section text primary key/);
    expect(create).toMatch(/data jsonb not null/);
    expect(create).toMatch(/updated_at timestamptz not null default now\(\)/);
    expect(create).toMatch(/updated_by uuid references auth\.users ?\(id\) on delete set null/);
  });

  it('restringe section exatamente às 8 seções do schema (com maiúsculas exatas)', () => {
    // Texto original, sem minúsculas: 'comoFunciona' precisa bater letra por letra.
    const raw = readFileSync(fromRoot(MIGRATION), 'utf8').replace(/\s+/g, ' ');
    const match = /check \(section in \(([^)]*)\)\)/i.exec(raw);
    const sections = match?.[1]?.split(',').map((item) => item.trim().replace(/^'|'$/g, ''));

    expect(sections?.sort()).toEqual([...SECTION_KEYS].sort());
  });

  it('exige que data seja um objeto JSON', () => {
    expect(readSql()).toMatch(/check \(jsonb_typeof\(data\) = 'object'\)/);
  });

  it('liga o RLS', () => {
    expect(statements()).toContain('alter table public.site_content enable row level security');
  });

  it('tem uma única política, só de leitura, para anon e authenticated', () => {
    const policies = statements().filter((s) => s.startsWith('create policy'));

    expect(policies).toHaveLength(1);
    expect(policies[0]).toMatch(
      /^create policy ".+" on public\.site_content for select to anon, authenticated using \(true\)$/,
    );
  });

  it('não tem política de escrita (a escrita só vem na spec 003)', () => {
    expect(readSql()).not.toMatch(/for (insert|update|delete|all)\b/);
  });

  it('revoga a escrita do anon (segunda trava além do RLS)', () => {
    expect(statements()).toContain(
      'revoke insert, update, delete, truncate on public.site_content from anon',
    );
  });

  it('não concede nada, não apaga nada e não usa privilégios elevados', () => {
    const sql = readSql();

    expect(sql).not.toMatch(/\bgrant\b/);
    expect(sql).not.toMatch(/\bdrop\b/);
    expect(sql).not.toMatch(/\btruncate public\./);
    expect(sql).not.toMatch(/security definer/);
    expect(sql).not.toMatch(/service_role/);
    expect(sql).not.toMatch(/disable row level security/);
  });

  it('não insere conteúdo (sem linha no banco, o build usa o padrão)', () => {
    expect(readSql()).not.toMatch(/\binsert into\b/);
  });
});
