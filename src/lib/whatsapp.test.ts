import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { buildWhatsAppLink } from './whatsapp';

// T04 — teste obrigatório do projeto (CLAUDE.md §4; spec 001, RF-17 / CA-17):
// número e mensagem do conteúdo geram https://wa.me/<número>?text=<mensagem codificada>.

describe('buildWhatsAppLink', () => {
  it('gera o link exato com o número e a mensagem padrão', () => {
    const { number, message } = defaultContent.contato.whatsapp;

    expect(buildWhatsAppLink(number, message)).toBe(
      'https://wa.me/5500000000000?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20saber%20mais%20sobre%20o%20atendimento.',
    );
  });

  it('codifica acentos, espaços, &, ?, #, +, %, quebra de linha e emoji', () => {
    const message = 'Olá, tudo bem? Sou mãe do João & da Maria #TEA +2 100%\nQuero agendar 🙂';
    const link = buildWhatsAppLink('5511999998888', message);
    const url = new URL(link);

    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/5511999998888');
    expect([...url.searchParams.keys()]).toEqual(['text']);
    expect(url.searchParams.get('text')).toBe(message);
    expect(url.hash).toBe('');
    // Espaço como %20 (não "+"), para o WhatsApp não mostrar "+" no texto.
    expect(link).not.toContain('+');
    expect(link).toContain('%2B2');
    expect(link).toContain('%0A');
  });

  it('sem mensagem, gera o link sem ?text=', () => {
    expect(buildWhatsAppLink('5511999998888', '')).toBe('https://wa.me/5511999998888');
    expect(buildWhatsAppLink('5511999998888', '   ')).toBe('https://wa.me/5511999998888');
  });

  it('apara espaços nas pontas da mensagem', () => {
    expect(buildWhatsAppLink('5511999998888', '  Oi  ')).toBe(
      'https://wa.me/5511999998888?text=Oi',
    );
  });

  it.each(['+5511999998888', '55 11 99999-8888', '55119999a8888', ''])(
    'recusa número fora do formato só dígitos: %j',
    (number) => {
      expect(() => buildWhatsAppLink(number, 'Oi')).toThrow(/WhatsApp/);
    },
  );
});
