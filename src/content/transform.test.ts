import { describe, expect, it } from 'vitest';
import { defaultContent } from './defaults';
import { findPlaceholders, mergeWithDefaults, resolveYear } from './transform';

// T06 — funções puras usadas na leitura do conteúdo (spec 001, RF-10 e casos de borda).

describe('mergeWithDefaults', () => {
  const base = { a: 'padrão', nested: { x: 1, y: 2 }, list: [1, 2, 3] };

  it('campo ausente recebe o padrão, inclusive em objetos aninhados', () => {
    expect(mergeWithDefaults(base, { a: 'banco', nested: { x: 9 } })).toEqual({
      a: 'banco',
      nested: { x: 9, y: 2 },
      list: [1, 2, 3],
    });
  });

  it('listas do banco substituem as do padrão', () => {
    expect(mergeWithDefaults(base, { list: [7] }).list).toEqual([7]);
    expect(mergeWithDefaults(base, { list: [] }).list).toEqual([]);
  });

  it('mantém chaves extras do banco (o schema as recusa depois)', () => {
    expect(mergeWithDefaults(base, { extra: true })).toMatchObject({ extra: true });
  });

  it('valor não-objeto do banco não é mesclado', () => {
    expect(mergeWithDefaults(base, 'texto')).toBe('texto');
    expect(mergeWithDefaults(base, { nested: null }).nested).toBeNull();
  });

  it('não altera os objetos de entrada', () => {
    const data = { nested: { x: 9 } };
    mergeWithDefaults(base, data);

    expect(data).toEqual({ nested: { x: 9 } });
    expect(base.nested).toEqual({ x: 1, y: 2 });
  });
});

describe('resolveYear', () => {
  it('troca {ano} em qualquer texto, sem alterar o original', () => {
    const resolved = resolveYear(defaultContent, 2031);

    expect(resolved.geral.copyright).toBe('© 2031 [Nome]');
    expect(resolved.inicio.title).toBe(defaultContent.inicio.title);
    expect(defaultContent.geral.copyright).toBe('© {ano} [Nome]');
  });

  it('troca todas as ocorrências', () => {
    const resolved = resolveYear({ text: '{ano} e {ano}', list: ['{ano}'] }, 2030);

    expect(resolved).toEqual({ text: '2030 e 2030', list: ['2030'] });
  });
});

describe('findPlaceholders', () => {
  it('lista os caminhos com texto entre colchetes e os placeholders declarados', () => {
    const paths = findPlaceholders(defaultContent);

    expect(paths).toContain('geral.name');
    expect(paths).toContain('sobre.title');
    expect(paths).toContain('sobre.education.0');
    expect(paths).toContain('espaco.photos.2.photo.alt');
    expect(paths).toContain('geral.initials');
    expect(paths).toContain('contato.whatsapp.number');
    expect(paths).not.toContain('inicio.title');
    expect(paths).not.toContain('geral.profession');
  });

  it('conteúdo preenchido não tem placeholders', () => {
    expect(findPlaceholders({ geral: { name: 'Ana', initials: 'AS' } })).toEqual([]);
  });
});
