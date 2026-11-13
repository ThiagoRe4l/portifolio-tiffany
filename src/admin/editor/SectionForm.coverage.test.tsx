import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { group, list, longText, photo, text, toggle } from '@/content/fields';
import { SECTION_KEYS, sectionSchemas } from '@/content/schema';
import type { SectionKey } from '@/content/types';
import { walkSchema } from '../../../tests/support/walkSchema';
import { buildTree } from './schemaTree';
import { SectionForm } from './SectionForm';

// Spec 004, T05 — teste obrigatório "cobertura do admin" (CLAUDE.md §4; CA-03).
// Para cada campo de cada schema existe um controle editável no formulário.
// A lista esperada vem do walkSchema dos testes, que é independente da árvore do admin.

/** `cards.0.title` → `cards[].title`, o formato do walkSchema. */
const asSchemaPath = (path: string) => path.replace(/\.\d+(?=\.|$)/g, '[]');

function expectedPaths(schema: Parameters<typeof walkSchema>[0]): string[] {
  const entries = walkSchema(schema, { intoPhotos: true });
  // Endereço e tamanho de cada foto são preenchidos pelo envio (005), não pelo formulário.
  const managedByUpload = new Set(
    entries
      .filter((entry) => entry.meta?.kind === 'photo')
      .flatMap((entry) => ['src', 'width', 'height'].map((field) => `${entry.path}.${field}`)),
  );
  return entries
    .filter((entry) => !['group', 'photo'].includes(entry.meta?.kind ?? ''))
    .map((entry) => entry.path)
    .filter((path) => !managedByUpload.has(path) && !path.endsWith('[]'))
    .concat(
      // Lista de textos: o item é o próprio campo.
      entries
        .filter((entry) => entry.path.endsWith('[]') && entry.meta?.kind !== 'group')
        .map((entry) => entry.path),
    );
}

function renderedPaths(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-field-path]')].map((element) =>
    asSchemaPath(element.dataset.fieldPath ?? ''),
  );
}

function renderSection(key: SectionKey) {
  return render(
    <SectionForm
      tree={buildTree(sectionSchemas[key])}
      value={defaultContent[key]}
      errors={new Map()}
      provisional={new Set()}
      onChange={vi.fn()}
    />,
  );
}

describe('cobertura do admin (teste obrigatório)', () => {
  it('o conteúdo padrão tem ao menos um item em cada lista, para todos os campos aparecerem', () => {
    const lists = SECTION_KEYS.flatMap((key) =>
      walkSchema(sectionSchemas[key])
        .filter((entry) => entry.meta?.kind === 'list')
        .map((entry) => ({ key, path: entry.path })),
    );

    for (const { key, path } of lists) {
      const value = path
        .split('.')
        .reduce<unknown>(
          (current, part) => (current as Record<string, unknown>)[part],
          defaultContent[key],
        );
      expect((value as unknown[]).length, `${key}.${path}`).toBeGreaterThan(0);
    }
  });

  it.each(SECTION_KEYS)('%s: cada campo do schema tem um controle no formulário', (key) => {
    const { container } = renderSection(key);

    expect([...new Set(renderedPaths(container))].sort()).toEqual(
      [...new Set(expectedPaths(sectionSchemas[key]))].sort(),
    );
  });

  it.each(SECTION_KEYS)('%s: todos os controles são editáveis', (key) => {
    const { container } = renderSection(key);
    const controls = [...container.querySelectorAll<HTMLElement>('input, textarea, select')];

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control, control.dataset.fieldPath).toBeEnabled();
      expect(control, control.dataset.fieldPath).not.toHaveAttribute('readonly');
    }
  });

  it('um campo novo no schema aparece sem mudar o admin', () => {
    const schema = group('Seção de teste', {
      title: text('Título', { max: 40 }),
      brandNew: longText('Campo novo', { max: 200 }),
      extras: list('Extras', group('Extra', { on: toggle('Ligado'), pic: photo('Imagem') }), {
        min: 1,
        max: 3,
      }),
    });
    const value = {
      title: 't',
      brandNew: '',
      extras: [{ on: false, pic: { src: '', width: 1, height: 1, alt: '' } }],
    };

    const { container } = render(
      <SectionForm
        tree={buildTree(schema)}
        value={value}
        errors={new Map()}
        provisional={new Set()}
        onChange={vi.fn()}
      />,
    );

    expect(renderedPaths(container).sort()).toEqual(expectedPaths(schema).sort());
  });
});
