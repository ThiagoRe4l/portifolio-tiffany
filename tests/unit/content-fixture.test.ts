import { describe, expect, it } from 'vitest';
import { getFieldMeta } from '@/content/fields';
import { defaultContent } from '@/content/defaults';
import { siteContentSchema } from '@/content/schema';
import { makeUniqueContent } from '../fixtures/content';
import { contentLeaves, textLeaves } from '../support/contentValues';
import { walkSchema } from '../support/walkSchema';

// T03 — conteúdo de teste (RF-14 / CA-14): base do teste obrigatório
// "sem texto fixo no site" (spec 002). Cada texto é único e reconhecível.

describe('makeUniqueContent (CA-14)', () => {
  const content = makeUniqueContent();
  const texts = textLeaves(content).map((leaf) => String(leaf.value));

  it('passa no schema', () => {
    const result = siteContentSchema.safeParse(content);

    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it('todos os textos são únicos', () => {
    const repeated = texts.filter((value, index) => texts.indexOf(value) !== index);

    expect(repeated).toEqual([]);
  });

  it('todo texto é marcado com «…» (exceto as iniciais, que só aceitam letras)', () => {
    const unmarked = textLeaves(content)
      .filter((leaf) => leaf.path !== 'geral.initials')
      .filter((leaf) => !/^«.+»$/u.test(String(leaf.value)))
      .map((leaf) => leaf.path);

    expect(unmarked).toEqual([]);
    expect(content.geral.initials).toMatch(/^\p{L}{1,3}$/u);
  });

  it('nenhum valor coincide com o conteúdo padrão', () => {
    const defaults = new Set(contentLeaves(defaultContent).map((leaf) => leaf.value));
    const same = contentLeaves(content)
      .filter((leaf) => typeof leaf.value === 'string' && leaf.value !== '')
      .filter((leaf) => defaults.has(leaf.value))
      .map((leaf) => leaf.path);

    expect(same).toEqual([]);
  });

  it('contatos opcionais vêm preenchidos (para os botões aparecerem)', () => {
    const { contato } = content;

    expect(contato.instagram.handle).not.toBe('');
    expect(contato.email.address).not.toBe('');
    expect(contato.phone.number).not.toBe('');
    expect(contato.map.embedUrl).not.toBe('');
    expect(contato.phone.number).not.toBe(contato.whatsapp.number);
  });

  it('toda lista tem pelo menos 2 itens quando o máximo permite', () => {
    const lists = walkSchema(siteContentSchema).filter((entry) => entry.meta?.kind === 'list');
    const short = lists
      .filter((entry) => (entry.meta?.max ?? 0) >= 2)
      .filter((entry) => {
        const value = entry.path
          .split('.')
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], content);
        return (value as unknown[]).length < 2;
      })
      .map((entry) => entry.path);

    expect(lists.length).toBeGreaterThan(0);
    expect(short).toEqual([]);
  });

  it('fotos têm endereço https (para o site renderizar <img>)', () => {
    const sources = contentLeaves(content).filter((leaf) => leaf.path.endsWith('.src'));

    expect(sources.length).toBeGreaterThan(0);
    for (const { value } of sources) expect(String(value)).toMatch(/^https:\/\//);
  });

  it('cada chamada devolve um objeto novo', () => {
    const a = makeUniqueContent();
    const b = makeUniqueContent();

    expect(a).not.toBe(b);
    expect(a).toEqual(b);
    a.inicio.title = 'mudou';
    expect(b.inicio.title).not.toBe('mudou');
  });

  it('os metadados reconhecem todo valor final (nenhum campo sem tipo)', () => {
    const unknown = contentLeaves(content)
      .filter((leaf) => leaf.kind === undefined)
      .map((leaf) => leaf.path);

    expect(unknown).toEqual([]);
    expect(getFieldMeta(siteContentSchema.shape.geral)?.kind).toBe('group');
  });
});
