import { describe, expect, it } from 'vitest';
import { PHOTO_NOTICES, photoErrorMessage, type PhotoErrorKind } from './photoMessages';

// Spec 005, T04 (RF-02, RF-03, RF-05, RF-07, RF-08).

const KINDS: PhotoErrorKind[] = [
  'type',
  'tooLarge',
  'unreadable',
  'network',
  'sessionExpired',
  'forbidden',
  'rejected',
  'unavailable',
  'unknown',
];

describe('photoErrorMessage', () => {
  it('textos exatos da spec', () => {
    expect(photoErrorMessage('type')).toBe('Use uma foto em JPG, PNG ou WebP.');
    expect(photoErrorMessage('tooLarge')).toBe('Esta foto é grande demais (máximo de 20 MB).');
    expect(photoErrorMessage('unreadable')).toBe(
      'Não foi possível preparar esta foto. Tente outra ou uma versão menor.',
    );
  });

  it('cada tipo tem a sua mensagem', () => {
    expect(new Set(KINDS.map(photoErrorMessage)).size).toBe(KINDS.length);
  });

  it.each(KINDS)('%s: frase em português, sem termo técnico', (kind) => {
    const message = photoErrorMessage(kind);

    expect(message).toMatch(/^[A-ZÁÉÍÓÚ].*\.$/);
    expect(message).not.toMatch(/\b(error|failed|jwt|http|rls|bucket|storage|supabase|\d{3})\b/i);
  });

  it.each<PhotoErrorKind>(['network', 'unavailable', 'unknown'])(
    '%s: avisa que a foto anterior continua',
    (kind) => {
      expect(photoErrorMessage(kind)).toMatch(/A foto anterior continua/);
    },
  );
});

describe('PHOTO_NOTICES', () => {
  it('progresso e aviso do texto alternativo, como na spec', () => {
    expect(PHOTO_NOTICES).toEqual({
      preparing: 'Preparando a foto…',
      uploading: 'Enviando foto…',
      reviewAlt: 'Confira se o texto alternativo descreve a foto nova.',
    });
  });
});
