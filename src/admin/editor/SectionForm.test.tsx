import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { sectionSchemas } from '@/content/schema';
import type { SectionKey } from '@/content/types';
import { buildTree } from './schemaTree';
import { SectionForm } from './SectionForm';
import { placeholderPaths } from './validation';

// Spec 004, T05 (RF-03, RF-06, RF-12; CA-07). Como o formulário liga os campos ao rascunho.

function renderForm(
  key: SectionKey,
  options: { errors?: Map<string, string>; provisional?: Set<string> } = {},
) {
  const onChange = vi.fn();
  render(
    <SectionForm
      tree={buildTree(sectionSchemas[key])}
      value={defaultContent[key]}
      errors={options.errors ?? new Map()}
      provisional={options.provisional ?? new Set()}
      onChange={onChange}
    />,
  );
  return onChange;
}

const field = (path: string) => document.querySelector<HTMLElement>(`[data-field-path="${path}"]`);

describe('SectionForm', () => {
  it('campos na ordem do schema, com os rótulos dele', () => {
    renderForm('inicio');
    const labels = [...document.querySelectorAll('label')].map((label) => label.textContent);

    expect(labels.slice(0, 5)).toEqual([
      'Etiqueta',
      'Título principal',
      'Texto',
      'Botão principal (WhatsApp)',
      'Botão secundário',
    ]);
  });

  it('grupos viram blocos com título', () => {
    renderForm('contato');

    expect(screen.getByRole('group', { name: 'Botão do WhatsApp' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Botão flutuante' })).toBeVisible();
  });

  it('a raiz da seção não vira bloco: o título dela já está no seletor', () => {
    renderForm('inicio');

    expect(screen.queryByRole('group', { name: 'Início' })).toBeNull();
  });

  it('editar um campo avisa o caminho completo e o valor', async () => {
    const user = userEvent.setup();
    const onChange = renderForm('trabalho');

    await user.type(field('cards.1.title') as HTMLElement, '!');

    expect(onChange).toHaveBeenLastCalledWith(
      ['cards', 1, 'title'],
      `${defaultContent.trabalho.cards[1]?.title}!`,
    );
  });

  it('mexer numa lista avisa o caminho da lista e a lista nova', async () => {
    const user = userEvent.setup();
    const onChange = renderForm('sobre');

    await user.click(screen.getByRole('button', { name: 'Mover Item da formação 2 para cima' }));

    const [first, second] = defaultContent.sobre.education;
    expect(onChange).toHaveBeenLastCalledWith(
      ['education'],
      [second, first, ...defaultContent.sobre.education.slice(2)],
    );
  });

  it('o texto alternativo da foto avisa o caminho da foto inteira', async () => {
    const user = userEvent.setup();
    const onChange = renderForm('sobre');

    await user.type(field('photo.alt') as HTMLElement, '!');

    expect(onChange).toHaveBeenLastCalledWith(['photo'], {
      ...defaultContent.sobre.photo,
      alt: `${defaultContent.sobre.photo.alt}!`,
    });
  });

  it('cada erro aparece no campo do caminho dele, inclusive em listas e fotos', () => {
    renderForm('trabalho', {
      errors: new Map([
        ['title', 'Campo obrigatório'],
        ['cards.2.text', 'Máximo de 220 caracteres'],
        ['cards', 'Mínimo de 1 item'],
      ]),
    });

    expect(field('title')).toHaveAccessibleDescription(/Campo obrigatório/);
    expect(field('cards.2.text')).toHaveAccessibleDescription(/Máximo de 220 caracteres/);
    expect(field('cards.1.text')).not.toHaveAttribute('aria-invalid');
    expect(field('cards')).toHaveAccessibleDescription(/Mínimo de 1 item/);
  });

  it('erro do texto alternativo aparece no campo da foto', () => {
    renderForm('sobre', { errors: new Map([['photo.alt', 'Campo obrigatório']]) });

    expect(field('photo.alt')).toHaveAccessibleDescription(/Campo obrigatório/);
  });

  it('textos provisórios mostram o aviso só onde estão (CA-07)', () => {
    renderForm('geral', { provisional: placeholderPaths('geral', defaultContent.geral) });

    expect(field('name')).toHaveAccessibleDescription(/Texto provisório/);
    expect(field('initials')).toHaveAccessibleDescription(/Texto provisório/);
    expect(field('profession')).not.toHaveAccessibleDescription(/Texto provisório/);
  });

  it('o interruptor e o ícone aparecem com o valor do conteúdo', () => {
    renderForm('contato');

    expect(within(document.body).getByRole('checkbox')).toBeChecked();
    renderForm('trabalho');
    expect(field('cards.0.icon')).toHaveValue(defaultContent.trabalho.cards[0]?.icon);
  });
});
