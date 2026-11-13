import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { group, icon, list, longText, phone, photo, text, toggle } from '@/content/fields';
import { email, instagram, mapUrl } from '@/content/fields';
import { ICONS } from '@/content/icons';
import type { Path } from '../draft';
import { buildTree, type FieldNode } from '../schemaTree';
import { IconField } from './IconField';
import { ListField } from './ListField';
import { PhotoField } from './PhotoField';
import { TextAreaField } from './TextAreaField';
import { TextInputField } from './TextInputField';
import { ToggleField } from './ToggleField';

// Spec 004, T04 (D5; RF-05 a RF-11; CA-04, CA-05, CA-06).

const nodeOf = (schema: Parameters<typeof buildTree>[0]) => buildTree(schema, 'campo', 'campo');

function Controlled<V>({
  initial,
  children,
}: {
  initial: V;
  children: (value: V, onChange: (next: unknown) => void) => React.ReactNode;
}) {
  const [value, setValue] = useState(initial);
  return <>{children(value, (next) => setValue(next as V))}</>;
}

const PATH: Path = ['bloco', 'campo'];

describe('TextInputField', () => {
  const node = nodeOf(text('Título', { max: 10, hint: 'Aparece no topo' }));

  function renderText(initial = 'abc', extra: Partial<Parameters<typeof TextInputField>[0]> = {}) {
    return render(
      <Controlled initial={initial}>
        {(value, onChange) => (
          <TextInputField node={node} path={PATH} value={value} onChange={onChange} {...extra} />
        )}
      </Controlled>,
    );
  }

  it('rótulo, dica e contagem ligados ao campo, com o caminho do schema', () => {
    renderText();
    const input = screen.getByLabelText('Título');

    expect(input).toHaveAttribute('data-field-path', 'bloco.campo');
    expect(input).toHaveAccessibleDescription(/Aparece no topo/);
    expect(input).toHaveAccessibleDescription(/3 \/ 10/);
  });

  it('a contagem acompanha a digitação e só anuncia quando passa do limite', async () => {
    const user = userEvent.setup();
    renderText('');
    const input = screen.getByLabelText('Título');
    const announcer = screen.getByRole('status');

    await user.type(input, '123456789');
    expect(screen.getByText('9 / 10')).toHaveAttribute('data-state', 'near');
    expect(announcer).toBeEmptyDOMElement();

    await user.type(input, '01');
    expect(screen.getByText('11 / 10')).toHaveAttribute('data-state', 'over');
    expect(announcer).toHaveTextContent('Passou do limite de 10 caracteres.');
  });

  it('colar texto com quebras de linha: viram espaço, na posição do cursor', () => {
    renderText('ab');
    const input = screen.getByLabelText('Título') as HTMLInputElement;
    input.setSelectionRange(1, 1);

    fireEvent.paste(input, { clipboardData: { getData: () => 'x\ny' } });

    expect(input).toHaveValue('ax yb');
  });

  it('texto provisório e erro aparecem e ficam ligados ao campo', () => {
    renderText('[Nome]', { provisional: true, error: 'Campo obrigatório' });
    const input = screen.getByLabelText('Título');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/Campo obrigatório/);
    expect(input).toHaveAccessibleDescription(
      /Texto provisório: troque antes de divulgar o site\./,
    );
  });

  it('telefone: a dica mostra o formato livre que o admin aceita (RF-10)', () => {
    const node = nodeOf(phone('Telefone'));
    render(<TextInputField node={node} path={PATH} value="" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Telefone')).toHaveAccessibleDescription(
      'Com DDD. Ex.: (11) 99999-8888',
    );
  });

  it.each<[string, FieldNode, Record<string, string>]>([
    ['telefone', nodeOf(phone('Telefone')), { type: 'tel', inputmode: 'tel' }],
    ['Instagram', nodeOf(instagram('Instagram')), { autocapitalize: 'none' }],
    ['e-mail', nodeOf(email('E-mail')), { type: 'email', inputmode: 'email' }],
    ['mapa', nodeOf(mapUrl('Mapa')), { type: 'url', inputmode: 'url' }],
  ])('%s: teclado certo no celular', (_name, contactNode, attributes) => {
    render(<TextInputField node={contactNode} path={PATH} value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText(contactNode.meta.label);

    for (const [name, value] of Object.entries(attributes)) {
      expect(input).toHaveAttribute(name, value);
    }
  });
});

describe('TextAreaField', () => {
  const node = nodeOf(longText('Texto', { max: 20 }));

  it('caixa de várias linhas, com contagem e caminho, que mantém as quebras', async () => {
    const user = userEvent.setup();
    render(
      <Controlled initial="">
        {(value, onChange) => (
          <TextAreaField node={node} path={PATH} value={value} onChange={onChange} />
        )}
      </Controlled>,
    );
    const area = screen.getByLabelText('Texto');

    await user.type(area, 'um{Enter}dois');

    expect(area.tagName).toBe('TEXTAREA');
    expect(area).toHaveValue('um\ndois');
    expect(area).toHaveAttribute('data-field-path', 'bloco.campo');
    expect(area).toHaveAccessibleDescription(/7 \/ 20/);
  });

  it('erro ligado ao campo', () => {
    render(
      <TextAreaField
        node={node}
        path={PATH}
        value=""
        onChange={vi.fn()}
        error="Campo obrigatório"
      />,
    );

    expect(screen.getByLabelText('Texto')).toHaveAccessibleDescription(/Campo obrigatório/);
  });
});

describe('ToggleField', () => {
  it('caixa de marcar com o rótulo do schema', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ToggleField
        node={nodeOf(toggle('Mostrar botão'))}
        path={PATH}
        value={false}
        onChange={onChange}
      />,
    );
    const box = screen.getByRole('checkbox', { name: 'Mostrar botão' });

    await user.click(box);

    expect(box).toHaveAttribute('data-field-path', 'bloco.campo');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('IconField', () => {
  it('lista os ícones pelo nome e mostra o desenho do escolhido', async () => {
    const user = userEvent.setup();
    render(
      <Controlled initial="clipboard">
        {(value, onChange) => (
          <IconField node={nodeOf(icon('Ícone'))} path={PATH} value={value} onChange={onChange} />
        )}
      </Controlled>,
    );
    const select = screen.getByRole('combobox', { name: 'Ícone' });

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(ICONS.map((item) => item.label));
    await user.selectOptions(select, 'heart');

    expect(select).toHaveValue('heart');
    expect(select).toHaveAttribute('data-field-path', 'bloco.campo');
    expect(document.querySelector('[data-icon="heart"]')).toBeInstanceOf(SVGElement);
  });
});

describe('PhotoField', () => {
  const node = nodeOf(photo('Foto principal'));
  const withPhoto = { src: 'https://exemplo.test/foto.webp', width: 800, height: 600, alt: 'Sala' };

  it('miniatura e texto alternativo; endereço e tamanho não são editáveis', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoField node={node} path={PATH} value={withPhoto} onChange={onChange} />);

    const group = screen.getByRole('group', { name: 'Foto principal' });
    // Miniatura decorativa (alt vazio): o texto alternativo está no campo ao lado.
    expect(group.querySelector('img')).toHaveAttribute('src', withPhoto.src);
    expect(group.querySelector('img')).toHaveAttribute('alt', '');
    expect(within(group).getAllByRole('textbox')).toHaveLength(1);

    const alt = within(group).getByLabelText('Texto alternativo');
    expect(alt).toHaveAttribute('data-field-path', 'bloco.campo.alt');
    await user.type(alt, 'x');

    expect(onChange).toHaveBeenLastCalledWith({ ...withPhoto, alt: 'Salax' });
  });

  it('sem foto: bloco de espera no lugar da miniatura', () => {
    render(
      <PhotoField node={node} path={PATH} value={{ ...withPhoto, src: '' }} onChange={vi.fn()} />,
    );

    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('[data-part="photo-placeholder"]')).toBeInstanceOf(HTMLElement);
  });

  it('erro e aviso do texto alternativo aparecem no campo', () => {
    render(
      <PhotoField
        node={node}
        path={PATH}
        value={{ ...withPhoto, alt: '' }}
        onChange={vi.fn()}
        altError="Campo obrigatório"
      />,
    );

    expect(screen.getByLabelText('Texto alternativo')).toHaveAccessibleDescription(
      /Campo obrigatório/,
    );
  });
});

describe('ListField', () => {
  const node = nodeOf(
    list('Cards', group('Card', { title: text('Título do card', { max: 50 }) }), {
      min: 1,
      max: 3,
      hint: 'Aparecem na ordem da lista',
    }),
  );
  const cards = (...titles: string[]) => titles.map((title) => ({ title }));

  function renderList(initial: unknown[]) {
    const spy = vi.fn();
    render(
      <Controlled initial={initial}>
        {(value, onChange) => (
          <ListField
            node={node}
            path={['cards']}
            value={value}
            onChange={(next) => {
              spy(next);
              onChange(next);
            }}
            renderItem={(index) => <p>conteudo {(value[index] as { title: string }).title}</p>}
          />
        )}
      </Controlled>,
    );
    return spy;
  }

  const order = () => screen.getAllByText(/^conteudo /).map((item) => item.textContent);

  it('grupo com o rótulo, a dica, o caminho e um título por item com resumo', () => {
    renderList(cards('A', 'B'));
    const fieldset = screen.getByRole('group', { name: 'Cards' });

    expect(fieldset).toHaveAttribute('data-field-path', 'cards');
    expect(fieldset).toHaveAccessibleDescription(/Aparecem na ordem da lista/);
    expect(within(fieldset).getByText('Card 1 · A')).toBeVisible();
    expect(within(fieldset).getByText('Card 2 · B')).toBeVisible();
  });

  it('mover só com o teclado; o foco acompanha o item', async () => {
    const user = userEvent.setup();
    renderList(cards('A', 'B', 'C'));

    screen.getByRole('button', { name: 'Mover Card 3 para cima' }).focus();
    await user.keyboard('{Enter}');

    expect(order()).toEqual(['conteudo A', 'conteudo C', 'conteudo B']);
    expect(screen.getByRole('button', { name: 'Mover Card 2 para cima' })).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(order()).toEqual(['conteudo C', 'conteudo A', 'conteudo B']);
    // No topo, "para cima" fica indisponível; o foco vai para "para baixo".
    expect(screen.getByRole('button', { name: 'Mover Card 1 para cima' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mover Card 1 para baixo' })).toHaveFocus();
  });

  it('o último não desce', () => {
    renderList(cards('A', 'B'));

    expect(screen.getByRole('button', { name: 'Mover Card 2 para baixo' })).toBeDisabled();
  });

  it('remover: o foco vai para o item que ficou no lugar', async () => {
    const user = userEvent.setup();
    renderList(cards('A', 'B', 'C'));

    await user.click(screen.getByRole('button', { name: 'Remover Card 2' }));

    expect(order()).toEqual(['conteudo A', 'conteudo C']);
    expect(screen.getByText('Card 2 · C')).toHaveFocus();
  });

  it('adicionar: item novo no fim, com o formato do schema, e foco nele', async () => {
    const user = userEvent.setup();
    const spy = renderList(cards('A'));

    await user.click(screen.getByRole('button', { name: 'Adicionar item: Cards' }));

    expect(spy).toHaveBeenLastCalledWith([{ title: 'A' }, { title: '' }]);
    expect(screen.getByText('Card 2')).toHaveFocus();
  });

  it('no mínimo: remover fica indisponível, com a explicação', async () => {
    const user = userEvent.setup();
    const spy = renderList(cards('A'));
    const remove = screen.getByRole('button', { name: 'Remover Card 1' });

    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAccessibleDescription(
      'Mínimo de 1 item: para remover, adicione outro antes.',
    );
    await user.click(remove);

    expect(spy).not.toHaveBeenCalled();
  });

  it('no máximo: adicionar fica indisponível, com a explicação', async () => {
    const user = userEvent.setup();
    const spy = renderList(cards('A', 'B', 'C'));
    const add = screen.getByRole('button', { name: 'Adicionar item: Cards' });

    expect(add).toHaveAttribute('aria-disabled', 'true');
    expect(add).toHaveAccessibleDescription('Máximo de 3 itens.');
    await user.click(add);

    expect(spy).not.toHaveBeenCalled();
  });

  it('erro da lista inteira aparece no grupo', () => {
    render(
      <ListField
        node={node}
        path={['cards']}
        value={[]}
        onChange={vi.fn()}
        error="Mínimo de 1 item"
        renderItem={() => null}
      />,
    );

    expect(screen.getByRole('group', { name: 'Cards' })).toHaveAccessibleDescription(
      /Mínimo de 1 item/,
    );
  });
});
