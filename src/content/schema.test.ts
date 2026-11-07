import { describe, expect, expectTypeOf, it } from 'vitest';
import type { FieldKind } from './fields';
import { getFieldMeta } from './fields';
import { SECTION_KEYS, sectionSchemas, siteContentSchema } from './schema';
import { formatIssues } from './transform';
import type { Photo, SectionKey, SiteContent } from './types';
import { sampleValue, setAtPath } from '../../tests/support/sampleContent';
import { walkSchema } from '../../tests/support/walkSchema';

// T02 — schemas das 8 seções. Cobre CA-01, CA-02, CA-04 e CA-07 (spec 001).
// As tabelas abaixo são o contrato do plano (plan.md › "Campos e limites").

const SECTION_LABELS: Record<SectionKey, string> = {
  geral: 'Geral',
  inicio: 'Início',
  sobre: 'Sobre mim',
  trabalho: 'Meu trabalho',
  atuacao: 'Área de atuação',
  comoFunciona: 'Como funciona',
  espaco: 'O espaço',
  contato: 'Contato',
};

/** Caminho → tipo de campo. Fotos são um campo só (o admin as trata como bloco). */
const EXPECTED_KINDS: Record<string, FieldKind> = {
  'geral.name': 'text',
  'geral.profession': 'text',
  'geral.crp': 'text',
  'geral.initials': 'text',
  'geral.footerText': 'longText',
  'geral.copyright': 'text',
  'geral.restrictedAreaLink': 'text',
  'geral.menu': 'group',
  'geral.menu.about': 'text',
  'geral.menu.work': 'text',
  'geral.menu.focus': 'text',
  'geral.menu.howItWorks': 'text',
  'geral.menu.space': 'text',
  'geral.menu.contact': 'text',
  'geral.headerCta': 'text',
  'geral.seoTitle': 'text',
  'geral.seoDescription': 'longText',
  'geral.shareImage': 'photo',

  'inicio.eyebrow': 'text',
  'inicio.title': 'text',
  'inicio.text': 'longText',
  'inicio.primaryCta': 'text',
  'inicio.secondaryCta': 'text',
  'inicio.photo': 'photo',
  'inicio.badge': 'group',
  'inicio.badge.title': 'text',
  'inicio.badge.subtitle': 'text',

  'sobre.eyebrow': 'text',
  'sobre.title': 'text',
  'sobre.photo': 'photo',
  'sobre.text': 'longText',
  'sobre.secondaryText': 'longText',
  'sobre.educationTitle': 'text',
  'sobre.education': 'list',
  'sobre.education[]': 'text',

  'trabalho.eyebrow': 'text',
  'trabalho.title': 'text',
  'trabalho.cards': 'list',
  'trabalho.cards[]': 'group',
  'trabalho.cards[].icon': 'icon',
  'trabalho.cards[].title': 'text',
  'trabalho.cards[].text': 'longText',

  'atuacao.eyebrow': 'text',
  'atuacao.title': 'text',
  'atuacao.text': 'longText',
  'atuacao.focusTitle': 'text',
  'atuacao.focusTags': 'list',
  'atuacao.focusTags[]': 'text',
  'atuacao.audienceTitle': 'text',
  'atuacao.audience': 'list',
  'atuacao.audience[]': 'group',
  'atuacao.audience[].title': 'text',
  'atuacao.audience[].text': 'longText',

  'comoFunciona.eyebrow': 'text',
  'comoFunciona.title': 'text',
  'comoFunciona.steps': 'list',
  'comoFunciona.steps[]': 'group',
  'comoFunciona.steps[].title': 'text',
  'comoFunciona.steps[].text': 'longText',

  'espaco.eyebrow': 'text',
  'espaco.title': 'text',
  'espaco.photos': 'list',
  'espaco.photos[]': 'group',
  'espaco.photos[].photo': 'photo',
  'espaco.photos[].caption': 'text',

  'contato.eyebrow': 'text',
  'contato.title': 'text',
  'contato.text': 'longText',
  'contato.whatsapp': 'group',
  'contato.whatsapp.number': 'phone',
  'contato.whatsapp.message': 'longText',
  'contato.whatsapp.buttonText': 'text',
  'contato.floatingButton': 'group',
  'contato.floatingButton.enabled': 'toggle',
  'contato.floatingButton.text': 'text',
  'contato.instagram': 'group',
  'contato.instagram.handle': 'instagram',
  'contato.instagram.buttonText': 'text',
  'contato.email': 'group',
  'contato.email.address': 'email',
  'contato.email.buttonText': 'text',
  'contato.phone': 'group',
  'contato.phone.number': 'phone',
  'contato.phone.buttonText': 'text',
  'contato.address': 'group',
  'contato.address.title': 'text',
  'contato.address.text': 'longText',
  'contato.hours': 'group',
  'contato.hours.title': 'text',
  'contato.hours.text': 'longText',
  'contato.map': 'group',
  'contato.map.embedUrl': 'mapUrl',
  'contato.map.title': 'text',
};

const OPTIONAL_FIELDS = [
  'sobre.educationTitle',
  'atuacao.focusTitle',
  'atuacao.audienceTitle',
  'espaco.photos[].caption',
  'contato.instagram.handle',
  'contato.email.address',
  'contato.phone.number',
  'contato.map.embedUrl',
];

/** Máximo de caracteres de cada texto. */
const TEXT_LIMITS: Record<string, number> = {
  'geral.name': 60,
  'geral.profession': 40,
  'geral.crp': 20,
  'geral.initials': 3,
  'geral.footerText': 200,
  'geral.copyright': 100,
  'geral.restrictedAreaLink': 30,
  'geral.menu.about': 24,
  'geral.menu.work': 24,
  'geral.menu.focus': 24,
  'geral.menu.howItWorks': 24,
  'geral.menu.space': 24,
  'geral.menu.contact': 24,
  'geral.headerCta': 30,
  'geral.seoTitle': 60,
  'geral.seoDescription': 160,
  'inicio.eyebrow': 60,
  'inicio.title': 90,
  'inicio.text': 260,
  'inicio.primaryCta': 30,
  'inicio.secondaryCta': 30,
  'inicio.badge.title': 50,
  'inicio.badge.subtitle': 60,
  'sobre.eyebrow': 60,
  'sobre.title': 80,
  'sobre.text': 700,
  'sobre.secondaryText': 700,
  'sobre.educationTitle': 40,
  'sobre.education[]': 140,
  'trabalho.eyebrow': 60,
  'trabalho.title': 80,
  'trabalho.cards[].title': 50,
  'trabalho.cards[].text': 220,
  'atuacao.eyebrow': 60,
  'atuacao.title': 80,
  'atuacao.text': 500,
  'atuacao.focusTitle': 40,
  'atuacao.focusTags[]': 32,
  'atuacao.audienceTitle': 40,
  'atuacao.audience[].title': 30,
  'atuacao.audience[].text': 200,
  'comoFunciona.eyebrow': 60,
  'comoFunciona.title': 80,
  'comoFunciona.steps[].title': 50,
  'comoFunciona.steps[].text': 240,
  'espaco.eyebrow': 60,
  'espaco.title': 80,
  'espaco.photos[].caption': 80,
  'contato.eyebrow': 60,
  'contato.title': 80,
  'contato.text': 300,
  'contato.whatsapp.message': 300,
  'contato.whatsapp.buttonText': 30,
  'contato.floatingButton.text': 20,
  'contato.instagram.buttonText': 30,
  'contato.email.buttonText': 30,
  'contato.phone.buttonText': 30,
  'contato.address.title': 40,
  'contato.address.text': 200,
  'contato.hours.title': 40,
  'contato.hours.text': 200,
  'contato.map.title': 80,
};

/** Mínimo e máximo de itens de cada lista. */
const LIST_LIMITS: Record<string, [number, number]> = {
  'sobre.education': [1, 8],
  'trabalho.cards': [1, 8],
  'atuacao.focusTags': [1, 12],
  'atuacao.audience': [1, 4],
  'comoFunciona.steps': [2, 5],
  'espaco.photos': [1, 9],
};

const entries = walkSchema(siteContentSchema);
const fields = entries.filter((entry) => !SECTION_KEYS.includes(entry.path as SectionKey));
const byPath = new Map(entries.map((entry) => [entry.path, entry]));

/** Caminho do walkSchema → caminho legível de formatIssues (`a.b[].c` → `a › b › #1 › c`). */
function readable(path: string): string {
  return path.replace(/\[\]/g, '.#1').split('.').join(' › ');
}

function errorsFor(content: unknown): string[] {
  const result = siteContentSchema.safeParse(content);
  return result.success ? [] : formatIssues(result.error);
}

function validContent(): Record<string, unknown> {
  return sampleValue(siteContentSchema) as Record<string, unknown>;
}

describe('seções (CA-01)', () => {
  it('existem exatamente as 8 chaves, na ordem da spec', () => {
    expect(SECTION_KEYS).toEqual([
      'geral',
      'inicio',
      'sobre',
      'trabalho',
      'atuacao',
      'comoFunciona',
      'espaco',
      'contato',
    ]);
    expect(Object.keys(sectionSchemas)).toEqual(SECTION_KEYS);
    expect(Object.keys(siteContentSchema.shape)).toEqual(SECTION_KEYS);
  });

  it.each(Object.entries(SECTION_LABELS))('a seção %s tem o rótulo "%s"', (key, label) => {
    expect(getFieldMeta(sectionSchemas[key as SectionKey])).toMatchObject({
      label,
      kind: 'group',
    });
  });

  it('o conteúdo completo exige todas as seções e recusa seção desconhecida', () => {
    const content = validContent();
    expect(errorsFor(content)).toEqual([]);

    const withoutContato = { ...content };
    delete withoutContato.contato;
    expect(errorsFor(withoutContato)).not.toEqual([]);
    expect(errorsFor({ ...content, depoimentos: {} })).not.toEqual([]);
  });
});

describe('campos (CA-02)', () => {
  it('cada seção tem exatamente os campos do contrato, com o tipo certo', () => {
    const actual = Object.fromEntries(fields.map((entry) => [entry.path, entry.meta?.kind]));

    expect(actual).toEqual(EXPECTED_KINDS);
  });

  it('só os campos previstos são opcionais (nome e CRP obrigatórios)', () => {
    const optional = fields.filter((entry) => entry.meta?.optional).map((entry) => entry.path);

    expect(optional.sort()).toEqual([...OPTIONAL_FIELDS].sort());
    expect(byPath.get('geral.name')?.meta?.optional).toBe(false);
    expect(byPath.get('geral.crp')?.meta?.optional).toBe(false);
  });

  it('os tipos TypeScript seguem o schema', () => {
    expectTypeOf<SiteContent['contato']['whatsapp']['number']>().toEqualTypeOf<string>();
    expectTypeOf<SiteContent['contato']['floatingButton']['enabled']>().toEqualTypeOf<boolean>();
    expectTypeOf<SiteContent['inicio']['photo']>().toEqualTypeOf<Photo>();
    expectTypeOf<SiteContent['trabalho']['cards']>().toBeArray();
    expectTypeOf<SectionKey>().toEqualTypeOf<
      'geral' | 'inicio' | 'sobre' | 'trabalho' | 'atuacao' | 'comoFunciona' | 'espaco' | 'contato'
    >();
  });
});

describe('rótulos (CA-07)', () => {
  const everything = walkSchema(siteContentSchema, { intoPhotos: true });

  it('todo campo, inclusive dentro de listas, grupos e fotos, tem rótulo em português', () => {
    const missing = everything.filter((entry) => !entry.meta?.label.trim()).map((e) => e.path);

    expect(missing).toEqual([]);
  });

  it('nenhum rótulo de campo é o próprio nome em inglês (seções já têm chave em português)', () => {
    const untranslated = everything
      .filter((entry) => !SECTION_KEYS.includes(entry.path as SectionKey))
      .filter((entry) => {
        const key = entry.path.split('.').pop()?.replace('[]', '') ?? '';
        return entry.meta?.label.toLowerCase() === key.toLowerCase();
      })
      .map((entry) => entry.path);

    expect(untranslated).toEqual([]);
  });

  it('textos e listas carregam os limites nos metadados (contador do admin)', () => {
    for (const [path, max] of Object.entries(TEXT_LIMITS)) {
      expect(byPath.get(path)?.meta?.max, path).toBe(max);
    }
    for (const [path, [min, max]] of Object.entries(LIST_LIMITS)) {
      expect(byPath.get(path)?.meta, path).toMatchObject({ min, max });
    }
  });
});

describe('limites (CA-04)', () => {
  it.each(Object.entries(TEXT_LIMITS))('%s aceita até %i caracteres', (path, max) => {
    const content = validContent();
    setAtPath(content, path, 'a'.repeat(max));

    expect(errorsFor(content)).toEqual([]);
  });

  it.each(Object.entries(TEXT_LIMITS))(
    '%s acima de %i caracteres falha citando seção, campo e limite',
    (path, max) => {
      const content = validContent();
      setAtPath(content, path, 'a'.repeat(max + 1));

      expect(errorsFor(content)).toEqual([`${readable(path)}: Máximo de ${max} caracteres`]);
    },
  );

  it.each(Object.entries(LIST_LIMITS))('lista %s respeita mínimo e máximo', (path, [min, max]) => {
    const element = byPath.get(`${path}[]`)?.schema;
    if (!element) throw new Error(`sem item em ${path}`);
    const item = () => sampleValue(element);
    const plural = (n: number) => (n === 1 ? `${n} item` : `${n} itens`);

    const atMax = validContent();
    setAtPath(atMax, path, Array.from({ length: max }, item));
    expect(errorsFor(atMax)).toEqual([]);

    const tooMany = validContent();
    setAtPath(tooMany, path, Array.from({ length: max + 1 }, item));
    expect(errorsFor(tooMany)).toEqual([`${readable(path)}: Máximo de ${plural(max)}`]);

    const tooFew = validContent();
    setAtPath(tooFew, path, Array.from({ length: min - 1 }, item));
    expect(errorsFor(tooFew)).toEqual([`${readable(path)}: Mínimo de ${plural(min)}`]);
  });

  it('erro em item de lista cita a posição a partir de 1', () => {
    const content = validContent();
    const cards = (content.trabalho as { cards: unknown[] }).cards;
    cards.push(sampleValue(byPath.get('trabalho.cards[]')!.schema));
    (cards[1] as { title: string }).title = '';

    expect(errorsFor(content)).toEqual(['trabalho › cards › #2 › title: Campo obrigatório']);
  });

  it('iniciais aceitam só letras', () => {
    const content = validContent();
    setAtPath(content, 'geral.initials', 'A1');

    expect(errorsFor(content)).toEqual(['geral › initials: Use só letras']);
  });

  it('WhatsApp é obrigatório e validado', () => {
    const content = validContent();
    setAtPath(content, 'contato.whatsapp.number', '11999998888');

    expect(errorsFor(content)).toEqual([
      'contato › whatsapp › number: Inclua 55 + DDD (só números)',
    ]);
  });
});
