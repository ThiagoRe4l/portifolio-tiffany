import { describe, expect, it } from 'vitest';
import { formatPhoneBR } from './phone';

// Spec 002, RF-11 — telefone formatado na linha de contato (texto gerado a partir
// dos dígitos do conteúdo, declarado no teste "sem texto fixo").

describe('formatPhoneBR', () => {
  it('celular com 9 dígitos', () => {
    expect(formatPhoneBR('5511912345678')).toBe('(11) 91234-5678');
  });

  it('fixo com 8 dígitos', () => {
    expect(formatPhoneBR('551133334444')).toBe('(11) 3333-4444');
  });

  it('outros DDDs', () => {
    expect(formatPhoneBR('5521987654321')).toBe('(21) 98765-4321');
  });

  it.each(['', '11912345678', '+5511912345678', '55 11 91234-5678', '5511912'])(
    'recusa %j (o schema já barra; aqui é a segunda trava)',
    (value) => {
      expect(() => formatPhoneBR(value)).toThrow(/telefone/i);
    },
  );
});
