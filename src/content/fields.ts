import { z } from 'zod';
import { ICON_IDS } from './icons';

/**
 * Construtores de campo do conteúdo (RF-03 a RF-07).
 *
 * Cada construtor cria um schema Zod **novo** e registra nele os metadados que o
 * admin (spec 004) usa para gerar o formulário: rótulo, dica, tipo de campo e limites.
 * Convenção: texto opcional vazio é `''` (nunca `undefined`).
 */

export type FieldKind =
  | 'text'
  | 'longText'
  | 'number'
  | 'photo'
  | 'icon'
  | 'toggle'
  | 'list'
  | 'group'
  | 'phone'
  | 'email'
  | 'instagram'
  | 'mapUrl';

export type FieldMeta = {
  label: string;
  hint?: string;
  kind: FieldKind;
  min?: number;
  max?: number;
  optional: boolean;
};

export const fieldMeta = z.registry<FieldMeta>();

export function getFieldMeta(schema: z.ZodType): FieldMeta | undefined {
  return fieldMeta.get(schema);
}

type Common = { hint?: string; optional?: boolean };

function withMeta<T extends z.ZodType>(
  schema: T,
  label: string,
  kind: FieldKind,
  options: Common & { min?: number; max?: number } = {},
): T {
  const meta: FieldMeta = { label, kind, optional: options.optional ?? false };
  if (options.hint !== undefined) meta.hint = options.hint;
  if (options.min !== undefined) meta.min = options.min;
  if (options.max !== undefined) meta.max = options.max;
  fieldMeta.add(schema as z.ZodType, meta);
  return schema;
}

const REQUIRED = 'Campo obrigatório';
const maxChars = (max: number) => `Máximo de ${max} caracteres`;
const plural = (count: number) => (count === 1 ? `${count} item` : `${count} itens`);

/** Texto que pode ficar vazio, mas, se preenchido, precisa passar no teste. */
function emptyOr(test: (value: string) => boolean, message: string, optional: boolean) {
  return z.string().refine((value) => (optional && value === '') || test(value), { message });
}

// ── Texto ────────────────────────────────────────────────────────────────────

type TextOptions = Common & { max: number; pattern?: RegExp; patternMessage?: string };

function buildText(label: string, kind: 'text' | 'longText', options: TextOptions) {
  const optional = options.optional ?? false;
  let schema = z.string().trim();
  if (!optional) schema = schema.min(1, REQUIRED);
  schema = schema.max(options.max, maxChars(options.max));
  if (options.pattern) {
    const pattern = options.pattern;
    schema = schema.refine((value) => (optional && value === '') || pattern.test(value), {
      message: options.patternMessage ?? 'Formato inválido',
    });
  }
  return withMeta(schema, label, kind, { ...options, optional });
}

export function text(label: string, options: TextOptions) {
  return buildText(label, 'text', options);
}

/** Texto de várias linhas (o admin mostra uma caixa maior). */
export function longText(label: string, options: TextOptions) {
  return buildText(label, 'longText', options);
}

// ── Foto ─────────────────────────────────────────────────────────────────────

function isHttpsUrl(value: string): boolean {
  return URL.canParse(value) && new URL(value).protocol === 'https:';
}

const MAX_DIMENSION = 10000;

function dimension(label: string) {
  return withMeta(
    z
      .number()
      .int('Use um número inteiro')
      .min(1, 'Mínimo de 1 pixel')
      .max(MAX_DIMENSION, `Máximo de ${MAX_DIMENSION} pixels`),
    label,
    'number',
    { min: 1, max: MAX_DIMENSION },
  );
}

/** Foto: endereço opcional (vazio = ainda sem foto), dimensões e texto alternativo obrigatório. */
export function photo(label: string, options: Common = {}) {
  const schema = z.strictObject({
    src: withMeta(
      emptyOr(isHttpsUrl, 'Endereço da imagem inválido (use https)', true),
      'Endereço da imagem',
      'text',
      { optional: true, hint: 'Preenchido automaticamente ao enviar a foto' },
    ),
    width: dimension('Largura (px)'),
    height: dimension('Altura (px)'),
    alt: text('Texto alternativo', {
      max: 150,
      hint: 'Descreva a foto para quem usa leitor de tela',
    }),
  });
  return withMeta(schema, label, 'photo', options);
}

// ── Escolhas ─────────────────────────────────────────────────────────────────

export function icon(label: string, options: Common = {}) {
  return withMeta(z.enum(ICON_IDS, { error: 'Escolha um ícone da lista' }), label, 'icon', options);
}

export function toggle(label: string, options: Common = {}) {
  return withMeta(z.boolean(), label, 'toggle', options);
}

// ── Estrutura ────────────────────────────────────────────────────────────────

export function list<T extends z.ZodType>(
  label: string,
  item: T,
  options: Common & { min: number; max: number },
) {
  const schema = z
    .array(item)
    .min(options.min, `Mínimo de ${plural(options.min)}`)
    .max(options.max, `Máximo de ${plural(options.max)}`);
  return withMeta(schema, label, 'list', options);
}

export function group<T extends z.ZodRawShape>(label: string, shape: T, options: Common = {}) {
  return withMeta(z.strictObject(shape), label, 'group', options);
}

// ── Contato (RF-06) ──────────────────────────────────────────────────────────

const PHONE = /^55\d{10,11}$/;
const INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;
const MAP_EMBED_PREFIX = 'https://www.google.com/maps/embed?';

/** Número com DDI 55 + DDD, só dígitos (ex.: 5511999998888). */
export function phone(label: string, options: Common = {}) {
  const optional = options.optional ?? false;
  return withMeta(
    emptyOr((value) => PHONE.test(value), 'Inclua 55 + DDD (só números)', optional),
    label,
    'phone',
    { hint: 'Ex.: 5511999998888', ...options, optional },
  );
}

export function email(label: string, options: Common = {}) {
  const optional = options.optional ?? false;
  return withMeta(
    emptyOr((value) => z.regexes.email.test(value), 'E-mail inválido', optional),
    label,
    'email',
    { ...options, optional },
  );
}

/** Só o nome de usuário, sem `@` nem link. */
export function instagram(label: string, options: Common = {}) {
  const optional = options.optional ?? false;
  return withMeta(
    emptyOr((value) => INSTAGRAM.test(value), 'Use só o nome de usuário, sem @ nem link', optional),
    label,
    'instagram',
    { hint: 'Ex.: psi.nome', ...options, optional },
  );
}

/** Só o link de incorporação do Google Maps ("Compartilhar › Incorporar um mapa"). */
export function mapUrl(label: string, options: Common = {}) {
  const optional = options.optional ?? false;
  return withMeta(
    emptyOr(
      (value) => value.startsWith(MAP_EMBED_PREFIX) && isHttpsUrl(value),
      'Use o link de incorporação do Google Maps (https://www.google.com/maps/embed?...)',
      optional,
    ),
    label,
    'mapUrl',
    { hint: 'No Google Maps: Compartilhar › Incorporar um mapa', ...options, optional },
  );
}
