import { describe, expect, it } from 'vitest';
import type { SaveErrorKind } from './contentApi';
import { EDITOR_NOTICES, saveErrorMessage } from './editorMessages';

// Spec 004, T03 (RF-16, RF-17, RF-21).

const KINDS: SaveErrorKind[] = [
  'conflict',
  'network',
  'sessionExpired',
  'forbidden',
  'unavailable',
  'unknown',
];

describe('saveErrorMessage', () => {
  it('conflito tem o texto exato da spec', () => {
    expect(saveErrorMessage('conflict')).toBe(
      'Esta seção foi alterada em outro lugar. Recarregue para ver a versão mais recente.',
    );
  });

  it('cada tipo tem a sua mensagem', () => {
    expect(new Set(KINDS.map(saveErrorMessage)).size).toBe(KINDS.length);
  });

  it.each(KINDS)('%s: frase em português, sem termo técnico', (kind) => {
    const message = saveErrorMessage(kind);

    expect(message).toMatch(/^[A-ZÁÉÍÓÚ].*\.$/);
    expect(message).not.toMatch(/\b(error|failed|token|jwt|http|rls|supabase|\d{3})\b/i);
  });

  it.each<SaveErrorKind>(['network', 'unavailable', 'unknown'])(
    '%s: avisa que as alterações continuam na tela',
    (kind) => {
      expect(saveErrorMessage(kind)).toMatch(/Suas alterações continuam aqui/);
    },
  );
});

describe('EDITOR_NOTICES', () => {
  it('traz os textos exatos da spec', () => {
    expect(EDITOR_NOTICES).toEqual({
      saved: 'Publicado. O site atualiza em alguns minutos.',
      loadFailed: 'Não foi possível carregar o conteúdo.',
    });
  });
});
