import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

// Spec 003, T05 (CA-03 e parte do CA-17).

function ControlledText(props: Partial<ComponentProps<typeof TextField>>) {
  const [value, setValue] = useState('');
  return <TextField label="E-mail" value={value} onChange={setValue} {...props} />;
}

function ControlledPassword(props: Partial<ComponentProps<typeof PasswordField>>) {
  const [value, setValue] = useState('');
  return (
    <PasswordField
      label="Senha"
      value={value}
      onChange={setValue}
      autoComplete="current-password"
      {...props}
    />
  );
}

describe('TextField', () => {
  it('o label fica ligado ao campo', () => {
    render(<ControlledText />);

    expect(screen.getByLabelText('E-mail').tagName).toBe('INPUT');
  });

  it('dois campos na mesma tela têm ids diferentes', () => {
    render(
      <>
        <ControlledText label="Um" />
        <ControlledText label="Dois" />
      </>,
    );

    expect(screen.getByLabelText('Um').id).not.toBe(screen.getByLabelText('Dois').id);
  });

  it('avisa cada alteração com o valor digitado', async () => {
    const user = userEvent.setup();
    render(<ControlledText />);

    await user.type(screen.getByLabelText('E-mail'), 'abc');

    expect(screen.getByLabelText('E-mail')).toHaveValue('abc');
  });

  it('repassa os atributos do campo', () => {
    render(<ControlledText type="email" autoComplete="email" placeholder="voce@email.com" />);
    const input = screen.getByLabelText('E-mail');

    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('placeholder', 'voce@email.com');
  });

  it('sem erro: não marca o campo como inválido', () => {
    render(<ControlledText />);
    const input = screen.getByLabelText('E-mail');

    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('com erro: o texto fica ligado ao campo', () => {
    render(<ControlledText error="Informe seu e-mail." />);
    const input = screen.getByLabelText('E-mail');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Informe seu e-mail.');
  });

  it('expõe o campo pela ref, para levar o foco ao erro', () => {
    const ref = { current: null as HTMLInputElement | null };

    render(<ControlledText ref={ref} />);

    expect(ref.current).toBe(screen.getByLabelText('E-mail'));
  });
});

describe('PasswordField', () => {
  const input = () => screen.getByLabelText('Senha');

  it('começa oculto, com o nome "Mostrar senha"', () => {
    render(<ControlledPassword />);

    expect(input()).toHaveAttribute('type', 'password');
    expect(input()).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toBeInTheDocument();
  });

  it('mostrar e ocultar mantém o valor e troca o nome e o ícone', async () => {
    const user = userEvent.setup();
    render(<ControlledPassword />);
    await user.type(input(), 'minha senha');

    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(toggle.querySelector('[data-icon="eye"]')).not.toBeNull();
    await user.click(toggle);

    expect(input()).toHaveAttribute('type', 'text');
    expect(input()).toHaveValue('minha senha');
    expect(toggle).toHaveAccessibleName('Ocultar senha');
    expect(toggle.querySelector('[data-icon="eyeOff"]')).not.toBeNull();

    await user.click(toggle);

    expect(input()).toHaveAttribute('type', 'password');
    expect(input()).toHaveValue('minha senha');
    expect(toggle).toHaveAccessibleName('Mostrar senha');
  });

  it('o botão não envia o formulário, com clique ou teclado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ControlledPassword />
      </form>,
    );
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });

    await user.click(toggle);
    toggle.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(toggle).toHaveAttribute('type', 'button');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('senha visível: o celular não corrige nem põe maiúscula', () => {
    render(<ControlledPassword />);

    expect(input()).toHaveAttribute('autocapitalize', 'none');
    expect(input()).toHaveAttribute('autocorrect', 'off');
    expect(input()).toHaveAttribute('spellcheck', 'false');
  });

  it('com erro: o texto fica ligado ao campo', () => {
    render(<ControlledPassword error="Informe sua senha." />);

    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveAccessibleDescription('Informe sua senha.');
  });

  it('expõe o campo pela ref', () => {
    const ref = { current: null as HTMLInputElement | null };

    render(<ControlledPassword ref={ref} />);

    expect(ref.current).toBe(input());
  });
});
