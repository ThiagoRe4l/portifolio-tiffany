// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 004, T01 (RF-14, RF-15, RF-19; CA-09, CA-12, CA-13). Lê o SQL como texto.
// A prova real (gravar pelo admin e ver o deploy no Cloudflare) é o roteiro da T09.

const MIGRATION = 'supabase/migrations/20261110120000_publish.sql';
const PREVIOUS = {
  'supabase/migrations/20261106120000_site_content.sql':
    '0d19a0b8c3ab0883021b4f4e314a15842d877a48c83276f591150c015cee3fc7',
  'supabase/migrations/20261108120000_admins.sql':
    'e0313b4644893debfe8f9a45a245055ecd44b57ae31a43eb60a320e748845f0a',
};

const raw = (path = MIGRATION) => readFileSync(fromRoot(path), 'utf8');

/** SQL sem comentários, em minúsculas e com espaços normalizados. */
const sql = () => raw().replace(/--.*$/gm, '').replace(/\s+/g, ' ').toLowerCase().trim();

type SqlFunction = { name: string; header: string; body: string };

/** Cada `create function`, separado em cabeçalho e corpo (o corpo tem `;` dentro). */
function functions(): SqlFunction[] {
  const pattern = /create function ([\w.]+)\(\)(.*?)as \$\$(.*?)\$\$/g;
  return [...sql().matchAll(pattern)].map(([, name = '', header = '', body = '']) => ({
    name,
    header,
    body,
  }));
}

const fn = (name: string) => functions().find((item) => item.name === name);

/** O que sobra fora dos corpos de função, dividido em comandos. */
function statements(): string[] {
  return sql()
    .replace(/as \$\$.*?\$\$/g, 'as $$corpo$$')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

const trigger = (name: string) => statements().find((s) => s.startsWith(`create trigger ${name} `));

describe(`migration ${MIGRATION}`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(MIGRATION))).toBe(true);
  });

  it('liga o pg_net (no esquema extensions) e o pg_cron', () => {
    expect(statements()).toContain('create extension if not exists pg_net with schema extensions');
    expect(statements()).toContain('create extension if not exists pg_cron');
  });

  describe('quem gravou e quando (RF-14)', () => {
    it('o banco preenche updated_at e updated_by, nunca o navegador', () => {
      const body = fn('private.stamp_site_content')?.body ?? '';

      expect(body).toMatch(/new\.updated_at := now\(\);/);
      expect(body).toMatch(/new\.updated_by := auth\.uid\(\);/);
      expect(body).toMatch(/return new;/);
    });

    it('roda antes de inserir ou atualizar, em cada linha', () => {
      expect(trigger('site_content_stamp')).toBe(
        'create trigger site_content_stamp before insert or update on public.site_content for each row execute function private.stamp_site_content()',
      );
    });
  });

  describe('deploy a cada gravação (RF-15)', () => {
    it('lê o endereço do Vault, pelo nome combinado', () => {
      const body = fn('private.request_deploy')?.body ?? '';

      expect(body).toMatch(
        /select decrypted_secret into hook from vault\.decrypted_secrets where name = 'cloudflare_deploy_hook';/,
      );
    });

    it('sem endereço no Vault, avisa e não chama nada', () => {
      const body = fn('private.request_deploy')?.body ?? '';
      const guard = body.indexOf('if hook is null then');
      const call = body.indexOf('net.http_post');

      expect(guard).toBeGreaterThan(-1);
      expect(body.slice(guard, call)).toMatch(/raise warning .*; return;/);
      expect(call).toBeGreaterThan(guard);
    });

    it('chama o deploy hook com POST pelo pg_net', () => {
      expect(fn('private.request_deploy')?.body).toMatch(
        /perform net\.http_post\(url := hook, body := '\{\}'::jsonb\);/,
      );
    });

    it('dispara depois de inserir ou atualizar, uma vez por linha gravada', () => {
      expect(trigger('site_content_publish')).toBe(
        'create trigger site_content_publish after insert or update on public.site_content for each row execute function private.site_content_saved()',
      );
      expect(fn('private.site_content_saved')?.body).toMatch(
        /perform private\.request_deploy\(\); return null;/,
      );
    });

    it('nenhum gatilho por comando: um update recusado por conflito não publica', () => {
      expect(sql()).not.toMatch(/for each statement/);
    });
  });

  describe('ano novo (RF-19)', () => {
    it('agenda o deploy para 1º de janeiro, 00:05 em Brasília', () => {
      expect(statements()).toContain(
        "select cron.schedule('deploy-ano-novo', '5 3 1 1 *', 'select private.request_deploy()')",
      );
    });
  });

  describe('privilégios', () => {
    it('cria as três funções, todas no esquema private', () => {
      expect(
        functions()
          .map((item) => item.name)
          .sort(),
      ).toEqual([
        'private.request_deploy',
        'private.site_content_saved',
        'private.stamp_site_content',
      ]);
      expect(statements()).toContain('create schema if not exists private');
    });

    it.each(['private.request_deploy', 'private.site_content_saved', 'private.stamp_site_content'])(
      '%s: security definer com search_path vazio',
      (name) => {
        const header = fn(name)?.header ?? '';

        expect(header).toMatch(/security definer/);
        expect(header).toMatch(/set search_path = ''/);
      },
    );

    it('revoga o esquema e a execução das funções de todos os papéis do cliente', () => {
      expect(statements()).toContain(
        'revoke all on schema private from public, anon, authenticated',
      );
      expect(statements()).toContain(
        'revoke all on all functions in schema private from public, anon, authenticated',
      );
    });

    it('não concede nada a ninguém', () => {
      expect(statements().filter((s) => s.startsWith('grant '))).toEqual([]);
    });

    it('não mexe em políticas, RLS nem em dados', () => {
      expect(sql()).not.toMatch(/\b(create|alter|drop) policy\b/);
      expect(sql()).not.toMatch(/row level security/);
      expect(sql()).not.toMatch(/\bdrop\b/);
      expect(sql()).not.toMatch(/\b(insert into|delete from|truncate)\b/);
    });
  });

  describe('o que não pode estar no repositório', () => {
    it('nenhum endereço (o deploy hook vai direto para o Vault), service_role ou e-mail', () => {
      expect(raw()).not.toMatch(/https?:\/\//);
      expect(raw().toLowerCase()).not.toMatch(/service_?role/);
      expect(raw()).not.toMatch(/[\w.+-]+@[\w-]+\.\w+/);
    });
  });
});

describe('migrations anteriores', () => {
  it.each(Object.entries(PREVIOUS))('%s continua igual, byte a byte (LF)', (path, sha256) => {
    const content = raw(path).replaceAll('\r\n', '\n');

    expect(createHash('sha256').update(content).digest('hex')).toBe(sha256);
  });
});
