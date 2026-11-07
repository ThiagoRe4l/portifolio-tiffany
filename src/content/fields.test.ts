import { describe, expect, it } from 'vitest';
import {
  email,
  getFieldMeta,
  group,
  icon,
  instagram,
  list,
  longText,
  mapUrl,
  phone,
  photo,
  text,
  toggle,
} from './fields';
import { ICONS } from './icons';

// T01 — construtores de campo: schema Zod + metadados para o admin.
// Cobre CA-03 (foto), CA-05 (ícone), CA-06 (contato) e CA-07 (rótulos), no nível de cada campo.

type Parseable = { safeParse: (value: unknown) => { success: boolean; error?: unknown } };

function messages(schema: Parseable, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  const error = result.error as { issues: { message: string }[] };
  return error.issues.map((issue) => issue.message);
}

const accepts = (schema: Parseable, value: unknown) => schema.safeParse(value).success;

describe('text / longText', () => {
  it('registra rótulo, tipo e limite', () => {
    const field = text('Título', { max: 90, hint: 'Aparece no topo' });

    expect(getFieldMeta(field)).toEqual({
      label: 'Título',
      hint: 'Aparece no topo',
      kind: 'text',
      max: 90,
      optional: false,
    });
    expect(getFieldMeta(longText('Texto', { max: 260 }))).toMatchObject({
      kind: 'longText',
      max: 260,
    });
  });

  it('recusa acima do máximo com mensagem em português', () => {
    const field = text('Título', { max: 5 });

    expect(accepts(field, '12345')).toBe(true);
    expect(messages(field, '123456')).toEqual(['Máximo de 5 caracteres']);
  });

  it('obrigatório recusa vazio e só espaços', () => {
    const field = text('Título', { max: 10 });

    expect(messages(field, '')).toEqual(['Campo obrigatório']);
    expect(messages(field, '   ')).toEqual(['Campo obrigatório']);
  });

  it('apara espaços nas pontas', () => {
    expect(text('Título', { max: 10 }).parse('  oi  ')).toBe('oi');
  });

  it('opcional aceita string vazia, mas não undefined', () => {
    const field = text('Título do bloco', { max: 40, optional: true });

    expect(accepts(field, '')).toBe(true);
    expect(accepts(field, undefined)).toBe(false);
    expect(getFieldMeta(field)?.optional).toBe(true);
  });

  it('aceita um padrão com mensagem própria', () => {
    const field = text('Iniciais', {
      max: 3,
      pattern: /^\p{L}+$/u,
      patternMessage: 'Use só letras',
    });

    expect(accepts(field, 'AbC')).toBe(true);
    expect(accepts(field, 'É')).toBe(true);
    expect(messages(field, 'A1')).toEqual(['Use só letras']);
  });

  it('recusa o que não é texto', () => {
    expect(accepts(text('Título', { max: 10 }), 42)).toBe(false);
  });
});

describe('photo', () => {
  const field = photo('Foto principal');
  const valid = { src: 'https://cdn.exemplo.com/a.webp', width: 800, height: 1000, alt: 'Sala' };

  it('registra o tipo foto e rótulos nos campos internos', () => {
    expect(getFieldMeta(field)).toMatchObject({ label: 'Foto principal', kind: 'photo' });
    expect(getFieldMeta(field.shape.alt)).toMatchObject({
      label: 'Texto alternativo',
      kind: 'text',
      max: 150,
    });
    expect(getFieldMeta(field.shape.src)?.label).toBeTruthy();
    expect(getFieldMeta(field.shape.width)?.label).toBeTruthy();
    expect(getFieldMeta(field.shape.height)?.label).toBeTruthy();
  });

  it('aceita foto completa e foto ainda sem endereço', () => {
    expect(accepts(field, valid)).toBe(true);
    expect(accepts(field, { ...valid, src: '' })).toBe(true);
  });

  it('recusa sem texto alternativo', () => {
    expect(accepts(field, { ...valid, alt: '' })).toBe(false);
    expect(accepts(field, { src: valid.src, width: valid.width, height: valid.height })).toBe(
      false,
    );
  });

  it.each(['http://cdn.exemplo.com/a.webp', 'javascript:alert(1)', 'a.webp', '//x.com/a.webp'])(
    'recusa endereço %s',
    (src) => {
      expect(messages(field, { ...valid, src })).toEqual([
        'Endereço da imagem inválido (use https)',
      ]);
    },
  );

  it.each([0, -1, 1.5, 10001])('recusa dimensão %s', (size) => {
    expect(accepts(field, { ...valid, width: size })).toBe(false);
    expect(accepts(field, { ...valid, height: size })).toBe(false);
  });

  it('recusa chave desconhecida', () => {
    expect(accepts(field, { ...valid, extra: 1 })).toBe(false);
  });
});

describe('icon', () => {
  const field = icon('Ícone');

  it('registra o tipo ícone', () => {
    expect(getFieldMeta(field)).toMatchObject({ label: 'Ícone', kind: 'icon' });
  });

  it('aceita todos os ícones da lista e recusa os demais', () => {
    for (const { id } of ICONS) expect(accepts(field, id)).toBe(true);
    expect(messages(field, 'rocket')).toEqual(['Escolha um ícone da lista']);
  });

  it('a lista tem 12 ícones únicos com nome em português', () => {
    expect(ICONS).toHaveLength(12);
    expect(new Set(ICONS.map((i) => i.id)).size).toBe(12);
    for (const { id, label } of ICONS) {
      expect(label.trim().length).toBeGreaterThan(0);
      expect(label).not.toBe(id);
    }
    expect(ICONS.map((i) => i.id)).toEqual(
      expect.arrayContaining(['clipboard', 'puzzle', 'family', 'school']),
    );
  });
});

describe('toggle', () => {
  it('aceita só booleano', () => {
    const field = toggle('Mostrar botão flutuante');

    expect(getFieldMeta(field)).toMatchObject({ kind: 'toggle' });
    expect(accepts(field, true)).toBe(true);
    expect(accepts(field, false)).toBe(true);
    expect(accepts(field, 'true')).toBe(false);
  });
});

describe('list', () => {
  const field = list('Formação', text('Item', { max: 20 }), { min: 1, max: 3 });

  it('registra tipo, mínimo e máximo', () => {
    expect(getFieldMeta(field)).toEqual({
      label: 'Formação',
      kind: 'list',
      min: 1,
      max: 3,
      optional: false,
    });
  });

  it('recusa fora do mínimo e do máximo', () => {
    expect(accepts(field, ['a'])).toBe(true);
    expect(accepts(field, ['a', 'b', 'c'])).toBe(true);
    expect(messages(field, [])).toEqual(['Mínimo de 1 item']);
    expect(messages(field, ['a', 'b', 'c', 'd'])).toEqual(['Máximo de 3 itens']);
    expect(messages(list('X', text('Y', { max: 5 }), { min: 2, max: 4 }), ['a'])).toEqual([
      'Mínimo de 2 itens',
    ]);
  });

  it('valida cada item', () => {
    expect(accepts(field, ['ok', ''])).toBe(false);
  });
});

describe('group', () => {
  const field = group('Selo', {
    title: text('Título', { max: 10 }),
    subtitle: text('Linha', { max: 10 }),
  });

  it('registra o tipo grupo', () => {
    expect(getFieldMeta(field)).toMatchObject({ label: 'Selo', kind: 'group' });
  });

  it('exige todos os campos e recusa chave desconhecida', () => {
    expect(accepts(field, { title: 'a', subtitle: 'b' })).toBe(true);
    expect(accepts(field, { title: 'a' })).toBe(false);
    expect(accepts(field, { title: 'a', subtitle: 'b', extra: 'c' })).toBe(false);
  });
});

describe('phone', () => {
  const field = phone('WhatsApp');

  it('registra o tipo telefone', () => {
    expect(getFieldMeta(field)).toMatchObject({ label: 'WhatsApp', kind: 'phone' });
  });

  it.each(['5511999998888', '551133334444'])('aceita %s', (value) => {
    expect(accepts(field, value)).toBe(true);
  });

  it.each(['11999998888', '+5511999998888', '55 11 99999-8888', '55119999a8888', '5511999', ''])(
    'recusa %s com a dica de formato',
    (value) => {
      expect(messages(field, value)).toEqual(['Inclua 55 + DDD (só números)']);
    },
  );

  it('opcional aceita vazio, mas ainda valida o formato', () => {
    const optional = phone('Telefone', { optional: true });

    expect(accepts(optional, '')).toBe(true);
    expect(accepts(optional, '11999998888')).toBe(false);
  });
});

describe('email', () => {
  const field = email('E-mail', { optional: true });

  it('aceita e-mail válido e vazio', () => {
    expect(getFieldMeta(field)).toMatchObject({ kind: 'email', optional: true });
    expect(accepts(field, 'contato@exemplo.com.br')).toBe(true);
    expect(accepts(field, '')).toBe(true);
  });

  it.each(['contato', 'contato@', '@exemplo.com', 'a b@exemplo.com'])('recusa %s', (value) => {
    expect(messages(field, value)).toEqual(['E-mail inválido']);
  });
});

describe('instagram', () => {
  const field = instagram('Instagram', { optional: true });

  it.each(['psi.nome', 'psi_nome2', 'a'])('aceita %s', (value) => {
    expect(accepts(field, value)).toBe(true);
  });

  it('aceita vazio quando opcional', () => {
    expect(getFieldMeta(field)).toMatchObject({ kind: 'instagram' });
    expect(accepts(field, '')).toBe(true);
  });

  it.each([
    '@psi.nome',
    'https://instagram.com/psi',
    'instagram.com/psi',
    'psi nome',
    'a'.repeat(31),
  ])('recusa %s', (value) => {
    expect(messages(field, value)).toEqual(['Use só o nome de usuário, sem @ nem link']);
  });
});

describe('mapUrl', () => {
  const field = mapUrl('Mapa', { optional: true });

  it('aceita link de incorporação do Google e vazio', () => {
    expect(getFieldMeta(field)).toMatchObject({ kind: 'mapUrl' });
    expect(accepts(field, 'https://www.google.com/maps/embed?pb=!1m18!1m12')).toBe(true);
    expect(accepts(field, '')).toBe(true);
  });

  it.each([
    'https://www.google.com/maps/place/x',
    'http://www.google.com/maps/embed?pb=1',
    'https://maps.app.goo.gl/abc',
    'https://evil.com/?https://www.google.com/maps/embed?',
    'javascript:alert(1)',
  ])('recusa %s', (value) => {
    expect(messages(field, value)).toEqual([
      'Use o link de incorporação do Google Maps (https://www.google.com/maps/embed?...)',
    ]);
  });
});

describe('instâncias', () => {
  it('cada chamada cria um schema novo com seus próprios metadados', () => {
    const a = text('A', { max: 10 });
    const b = text('B', { max: 20 });

    expect(a).not.toBe(b);
    expect(getFieldMeta(a)?.label).toBe('A');
    expect(getFieldMeta(b)?.label).toBe('B');
  });
});
