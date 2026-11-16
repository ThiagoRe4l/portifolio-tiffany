// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Spec 005, T01 (RF-09, RF-10; CA-09, parte estática). Lê o SQL como texto. A prova
// real, com conta fora de admins e anônimo tentando enviar, é o roteiro da T09.

const MIGRATION = 'supabase/migrations/20261115120000_photos.sql';
const PREVIOUS = {
  'supabase/migrations/20261106120000_site_content.sql':
    '0d19a0b8c3ab0883021b4f4e314a15842d877a48c83276f591150c015cee3fc7',
  'supabase/migrations/20261108120000_admins.sql':
    'e0313b4644893debfe8f9a45a245055ecd44b57ae31a43eb60a320e748845f0a',
  'supabase/migrations/20261110120000_publish.sql':
    'f5e39aad09cca78c55fd163fdda5c637b296493834e61f6f08ef5f7db31c8db5',
};

const BUCKET_CHECK = "bucket_id = 'site-photos'";
const IS_ADMIN =
  'exists \\(select 1 from public\\.admins a where a\\.user_id = \\(select auth\\.uid\\(\\)\\)\\)';
const GUARD = `\\(${BUCKET_CHECK} and ${IS_ADMIN}\\)`;

const raw = (path = MIGRATION) => readFileSync(fromRoot(path), 'utf8');

/** SQL sem comentários, em minúsculas e com espaços normalizados. */
const sql = () =>
  raw()
    .replace(/--.*$/gm, '')
    .replace(/\s+/g, ' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .toLowerCase()
    .trim();

const statements = () =>
  sql()
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

const policies = () => statements().filter((statement) => statement.startsWith('create policy'));
const policyFor = (command: string) =>
  policies().find((statement) => statement.includes(` for ${command} `));

describe(`migration ${MIGRATION}`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(MIGRATION))).toBe(true);
  });

  describe('bucket (RF-09, RF-10)', () => {
    it('público para leitura, até 2 MB, só WebP e JPG, sem sobrescrever se já existir', () => {
      expect(statements()).toContain(
        "insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('site-photos', 'site-photos', true, 2097152, array['image/webp', 'image/jpeg']) on conflict (id) do nothing",
      );
    });
  });

  describe('quem grava (RF-10)', () => {
    it('três políticas, todas em storage.objects e para authenticated', () => {
      expect(policies()).toHaveLength(3);
      for (const policy of policies()) {
        expect(policy).toMatch(/ on storage\.objects for (insert|update|delete) to authenticated /);
      }
    });

    it('enviar exige o bucket e conta em admins', () => {
      expect(policyFor('insert')).toMatch(new RegExp(`with check ${GUARD}$`));
    });

    it('trocar exige o bucket e conta em admins, antes e depois', () => {
      expect(policyFor('update')).toMatch(new RegExp(`using ${GUARD} with check ${GUARD}$`));
    });

    it('apagar exige o bucket e conta em admins', () => {
      expect(policyFor('delete')).toMatch(new RegExp(`using ${GUARD}$`));
    });

    it('nenhuma política de leitura: o bucket público serve as fotos sem permitir listar', () => {
      expect(sql()).not.toMatch(/\bfor (select|all)\b/);
      expect(sql()).not.toMatch(/\bto (anon|public)\b/);
    });
  });

  describe('o que a migration não pode fazer', () => {
    it('não concede nada, não usa privilégios elevados e não cita a service_role', () => {
      expect(sql()).not.toMatch(/\bgrant\b/);
      expect(sql()).not.toMatch(/security definer/);
      expect(raw().toLowerCase()).not.toMatch(/service_?role/);
    });

    it('não apaga, não desliga RLS e não mexe em outras tabelas', () => {
      expect(sql()).not.toMatch(/\b(drop|truncate|delete from|alter policy)\b/);
      expect(sql()).not.toMatch(/row level security/);
      expect(sql()).not.toMatch(/public\.site_content/);
    });

    it('nenhum endereço nem e-mail no arquivo', () => {
      expect(raw()).not.toMatch(/https?:\/\//);
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
