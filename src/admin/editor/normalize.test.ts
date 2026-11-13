import { describe, expect, it } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { sectionSchemas } from '@/content/schema';
import {
  displayPhone,
  normalizeInstagram,
  normalizePhone,
  normalizeSection,
  singleLine,
  toDisplay,
} from './normalize';
import { buildTree } from './schemaTree';

// Spec 004, T02 (D3; RF-10, CA-06).

describe('normalizePhone', () => {
  it.each([
    ['(11) 99999-8888', '5511999998888'],
    ['11 3333-4444', '551133334444'],
    ['+55 11 99999-8888', '5511999998888'],
    ['+55 (11) 99999-8888', '5511999998888'],
    ['5511999998888', '5511999998888'],
    ['(55) 99999-8888', '5555999998888'],
    ['  ', ''],
    ['', ''],
  ])('%j vira %j', (typed, stored) => {
    expect(normalizePhone(typed)).toBe(stored);
  });

  it('número incompleto fica só com os dígitos, para o schema apontar o erro', () => {
    expect(normalizePhone('(11) 9999')).toBe('119999');
  });
});

describe('displayPhone', () => {
  it.each([
    ['5511999998888', '+55 (11) 99999-8888'],
    ['551133334444', '+55 (11) 3333-4444'],
    ['', ''],
    ['123', '123'],
  ])('%j aparece como %j', (stored, shown) => {
    expect(displayPhone(stored)).toBe(shown);
  });

  it('ida e volta não muda o número', () => {
    expect(normalizePhone(displayPhone('5511999998888'))).toBe('5511999998888');
  });
});

describe('normalizeInstagram', () => {
  it.each([
    ['@psi.nome', 'psi.nome'],
    ['psi.nome', 'psi.nome'],
    ['https://www.instagram.com/psi.nome/', 'psi.nome'],
    ['instagram.com/psi.nome?igsh=abc', 'psi.nome'],
    ['  @psi_nome  ', 'psi_nome'],
    ['', ''],
  ])('%j vira %j', (typed, stored) => {
    expect(normalizeInstagram(typed)).toBe(stored);
  });
});

describe('singleLine', () => {
  it('quebras de linha coladas viram um espaço', () => {
    expect(singleLine('linha um\nlinha dois\r\n\r\ntrês')).toBe('linha um linha dois três');
  });
});

describe('normalizeSection e toDisplay', () => {
  const tree = buildTree(sectionSchemas.contato);

  it('normaliza telefone e Instagram onde estiverem, e mais nada', () => {
    const typed = {
      ...defaultContent.contato,
      whatsapp: { ...defaultContent.contato.whatsapp, number: '(11) 99999-8888' },
      instagram: { ...defaultContent.contato.instagram, handle: '@psi.nome' },
      phone: { ...defaultContent.contato.phone, number: '+55 11 3333-4444' },
      title: '  Título com espaços  ',
    };

    const stored = normalizeSection(tree, typed);

    expect(stored.whatsapp.number).toBe('5511999998888');
    expect(stored.instagram.handle).toBe('psi.nome');
    expect(stored.phone.number).toBe('551133334444');
    expect(stored.title).toBe('  Título com espaços  ');
  });

  it('para exibir, formata os telefones; normalizar de volta dá o original', () => {
    const stored = {
      ...defaultContent.contato,
      whatsapp: { ...defaultContent.contato.whatsapp, number: '5511999998888' },
    };

    const shown = toDisplay(tree, stored);

    expect(shown.whatsapp.number).toBe('+55 (11) 99999-8888');
    expect(normalizeSection(tree, shown)).toEqual(stored);
  });
});
