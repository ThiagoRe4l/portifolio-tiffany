import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

// Spec 004, T07 (D7). O navegador cuida do foco preso e do fundo inerte (E2E).

function renderDialog() {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Descartar alterações?"
      message="As alterações desta seção ainda não foram salvas."
      confirmLabel="Descartar"
      cancelLabel="Continuar editando"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('abre como janela modal, com título e mensagem ligados', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'Descartar alterações?' });

    expect(dialog).toHaveAttribute('open');
    expect(dialog).toHaveAccessibleDescription('As alterações desta seção ainda não foram salvas.');
  });

  it('o foco começa na opção segura', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Continuar editando' })).toHaveFocus();
  });

  it('cada botão chama a sua ação', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('Esc vale como cancelar, sem o navegador fechar por conta própria', () => {
    const { onCancel } = renderDialog();
    const event = new Event('cancel', { cancelable: true });

    fireEvent(screen.getByRole('dialog'), event);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });
});
