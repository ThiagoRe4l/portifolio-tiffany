import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { sectionSchemas } from '@/content/schema';
import { setAt } from './draft';
import { pathKey, placeholderPaths, validateSection } from './validation';

// Spec 004, T02 (D3; RF-12, RF-13).

describe('pathKey', () => {
  it('junta o caminho com pontos', () => {
    expect(pathKey(['cards', 2, 'title'])).toBe('cards.2.title');
    expect(pathKey([])).toBe('');
  });
});

describe('validateSection', () => {
  it('conteúdo válido: devolve a saída do schema, com as pontas aparadas', () => {
    const value = setAt(defaultContent.inicio, ['title'], '  Título  ');

    const result = validateSection(sectionSchemas.inicio, value);

    expect(result).toEqual({ ok: true, data: { ...defaultContent.inicio, title: 'Título' } });
  });

  it('com erros: um por caminho, com a mensagem do schema', () => {
    let value: unknown = setAt(defaultContent.trabalho, ['title'], '');
    value = setAt(value, ['cards', 1, 'title'], 'x'.repeat(51));

    const result = validateSection(sectionSchemas.trabalho, value);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.fromEntries(result.errors)).toEqual({
      title: 'Campo obrigatório',
      'cards.1.title': 'Máximo de 50 caracteres',
    });
  });

  it('erro da lista inteira fica no caminho da lista', () => {
    const value = setAt(defaultContent.sobre, ['education'], []);

    const result = validateSection(sectionSchemas.sobre, value);

    expect(result.ok ? null : result.errors.get('education')).toBe('Mínimo de 1 item');
  });

  it('dois erros no mesmo campo: fica o primeiro', () => {
    const value = setAt(defaultContent.geral, ['initials'], 'A1B2');

    const result = validateSection(sectionSchemas.geral, value);

    expect(result.ok ? null : result.errors.get('initials')).toBe('Máximo de 3 caracteres');
  });
});

describe('placeholderPaths', () => {
  it('acha os textos entre colchetes e os provisórios declarados', () => {
    const paths = placeholderPaths('geral', defaultContent.geral);

    expect(paths.has('name')).toBe(true);
    expect(paths.has('initials')).toBe(true);
    expect(paths.has('profession')).toBe(false);
  });

  it('dentro de listas, pelo índice', () => {
    expect(placeholderPaths('sobre', defaultContent.sobre).has('education.0')).toBe(true);
  });

  it('texto trocado deixa de ser provisório', () => {
    const value = setAt(defaultContent.geral, ['name'], 'Ana Souza');

    expect(placeholderPaths('geral', value).has('name')).toBe(false);
  });
});
