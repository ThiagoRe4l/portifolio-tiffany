// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 003, T02 (RF-13, CA-13). Lê o SQL como texto. A prova real, com cada papel
// tentando gravar no banco, é o roteiro manual do CA-14, depois de aplicada.

const MIGRATION = 'supabase/migrations/20261108120000_admins.sql';
const FIRST_MIGRATION = 'supabase/migrations/20261106120000_site_content.sql';
const FIRST_MIGRATION_SHA256 = '0d19a0b8c3ab0883021b4f4e314a15842d877a48c83276f591150c015cee3fc7';

const IS_ADMIN = String.raw`\(exists \(select 1 from public\.admins a where a\.user_id = \(select auth\.uid\(\)\)\)\)`;

function raw(path = MIGRATION): string {
  return readFileSync(fromRoot(path), 'utf8');
}

/** SQL sem comentários, em minúsculas e com espaços normalizados. */
function sql(): string {
  return raw().replace(/--.*$/gm, '').replace(/\s+/g, ' ').toLowerCase().trim();
}

function statements(): string[] {
  return sql()
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const policiesOn = (table: string) =>
  statements().filter(
    (statement) =>
      statement.startsWith('create policy') && statement.includes(` on public.${table} `),
  );

const grants = () => statements().filter((statement) => statement.startsWith('grant '));

describe(`migration ${MIGRATION}`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(MIGRATION))).toBe(true);
  });

  describe('tabela admins', () => {
    it('tem uma linha por conta, ligada a auth.users', () => {
      const create = statements().find((s) => s.startsWith('create table public.admins'));

      expect(create).toBeDefined();
      expect(create).toMatch(/user_id uuid primary key references auth\.users ?\(id\)/);
      expect(create).toMatch(/on delete cascade/);
      expect(create).toMatch(/created_at timestamptz not null default now\(\)/);
    });

    it('liga o RLS', () => {
      expect(statements()).toContain('alter table public.admins enable row level security');
    });

    it('a única política é ler a própria linha, só para authenticated', () => {
      const policies = policiesOn('admins');

      expect(policies).toHaveLength(1);
      expect(policies[0]).toMatch(
        /^create policy ".+" on public\.admins for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)$/,
      );
    });

    it('nenhum papel do cliente grava: revoga tudo e devolve só a leitura', () => {
      expect(statements()).toContain('revoke all on public.admins from anon, authenticated');
      expect(grants().filter((grant) => grant.includes('public.admins'))).toEqual([
        'grant select on public.admins to authenticated',
      ]);
    });
  });

  describe('escrita em site_content', () => {
    it('tem só as políticas de inserir e atualizar', () => {
      expect(policiesOn('site_content')).toHaveLength(2);
    });

    it('inserir exige conta em admins', () => {
      const insert = policiesOn('site_content').find((s) => s.includes(' for insert '));

      expect(insert).toMatch(
        new RegExp(
          `^create policy ".+" on public\\.site_content for insert to authenticated with check ${IS_ADMIN}$`,
        ),
      );
    });

    it('atualizar exige conta em admins, antes e depois da alteração', () => {
      const update = policiesOn('site_content').find((s) => s.includes(' for update '));

      expect(update).toMatch(
        new RegExp(
          `^create policy ".+" on public\\.site_content for update to authenticated using ${IS_ADMIN} with check ${IS_ADMIN}$`,
        ),
      );
    });

    it('apagar continua proibido, por política e por permissão', () => {
      expect(sql()).not.toMatch(/\bfor (delete|all)\b/);
      expect(statements()).toContain(
        'revoke delete, truncate on public.site_content from authenticated',
      );
    });

    it('authenticated recebe apenas inserir e atualizar', () => {
      expect(grants().filter((grant) => grant.includes('public.site_content'))).toEqual([
        'grant insert, update on public.site_content to authenticated',
      ]);
    });

    it('o papel anônimo não recebe nada', () => {
      expect(grants().filter((grant) => /\bto\b.*\b(anon|public)\b$/.test(grant))).toEqual([]);
      expect(sql()).not.toMatch(/\bto anon\b/);
    });
  });

  describe('o que a migration não pode fazer', () => {
    it('não usa privilégios elevados e não cita a service_role, nem em comentário', () => {
      expect(sql()).not.toMatch(/security definer/);
      expect(raw().toLowerCase()).not.toMatch(/service_?role/);
    });

    it('não desliga RLS, não apaga e não mexe em políticas existentes', () => {
      expect(sql()).not.toMatch(/disable row level security/);
      expect(sql()).not.toMatch(/\bdrop\b/);
      expect(sql()).not.toMatch(/\balter policy\b/);
      expect(sql()).not.toMatch(/\btruncate public\./);
    });

    it('não insere linhas: o e-mail da administradora não fica no repositório', () => {
      expect(sql()).not.toMatch(/\binsert into\b/);
      expect(raw()).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    });
  });
});

describe('migration da 001', () => {
  it('continua igual, byte a byte (LF)', () => {
    const content = raw(FIRST_MIGRATION).replaceAll('\r\n', '\n');

    expect(createHash('sha256').update(content).digest('hex')).toBe(FIRST_MIGRATION_SHA256);
  });
});
