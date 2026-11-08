import { describe, expect, it } from 'vitest';
import { instagramUrl, mailtoUrl, telUrl } from './contactLinks';

// Spec 002, RF-14 — destinos dos botões de contato (o WhatsApp está em whatsapp.ts).

describe('instagramUrl', () => {
  it('monta o perfil a partir do usuário', () => {
    expect(instagramUrl('perfil.de_teste2')).toBe('https://www.instagram.com/perfil.de_teste2');
  });

  it.each(['', '@perfil', 'instagram.com/perfil', 'perfil teste'])('recusa %j', (value) => {
    expect(() => instagramUrl(value)).toThrow(/Instagram/);
  });
});

describe('mailtoUrl', () => {
  it('monta o mailto com o endereço intacto', () => {
    expect(mailtoUrl('contato+site@exemplo-teste.com.br')).toBe(
      'mailto:contato+site@exemplo-teste.com.br',
    );
  });

  it.each(['', 'contato', 'a b@exemplo.com', 'x@y.com?subject=oi'])('recusa %j', (value) => {
    expect(() => mailtoUrl(value)).toThrow(/e-mail/i);
  });
});

describe('telUrl', () => {
  it('monta o tel: com o + do DDI', () => {
    expect(telUrl('5511912345678')).toBe('tel:+5511912345678');
  });

  it.each(['', '+5511912345678', '55 11 91234', 'abc'])('recusa %j', (value) => {
    expect(() => telUrl(value)).toThrow(/telefone/i);
  });
});
