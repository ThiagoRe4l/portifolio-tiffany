import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SubmitButton } from './SubmitButton';

// Spec 003, T05 (RF-04).

function renderInForm(busy: boolean) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <input aria-label="campo" />
      <SubmitButton busy={busy} busyLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>,
  );
  return onSubmit;
}

describe('SubmitButton', () => {
  it('livre: envia o formulário', async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm(false);
    const button = screen.getByRole('button', { name: 'Entrar' });

    await user.click(button);

    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('ocupado: desabilitado e indicando que está carregando', () => {
    renderInForm(true);
    const button = screen.getByRole('button', { name: 'Entrando…' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
  });

  it('ocupado: nem clique nem Enter disparam de novo', async () => {
    const user = userEvent.setup();
    const onSubmit = renderInForm(true);

    await user.click(screen.getByRole('button'));
    await user.type(screen.getByLabelText('campo'), '{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
