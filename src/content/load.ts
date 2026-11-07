import { defaultContent } from './defaults';
import { SECTION_KEYS, siteContentSchema } from './schema';
import { findPlaceholders, formatIssues, mergeWithDefaults, resolveYear } from './transform';
import type { SectionKey, SiteContent } from './types';

/**
 * Leitura do conteúdo no build (spec 001, RF-09 / RF-10). Roda só no Node (build
 * e `npm run dev`), nunca no navegador do visitante.
 *
 * | Situação                 | sem REQUIRE_REMOTE_CONTENT | REQUIRE_REMOTE_CONTENT=true |
 * |--------------------------|----------------------------|-----------------------------|
 * | variáveis ausentes       | padrão + aviso             | falha                       |
 * | rede/HTTP com erro       | padrão + aviso             | falha                       |
 * | seção sem linha no banco | padrão da seção            | padrão da seção + aviso     |
 * | seção inválida           | falha                      | falha                       |
 * | placeholders restantes   | —                          | aviso                       |
 */

export type LoadEnv = Partial<
  Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY' | 'REQUIRE_REMOTE_CONTENT', string>
>;

export type LoadOptions = {
  env: LoadEnv;
  now?: Date;
  fetch?: typeof fetch;
  retryDelayMs?: number;
  timeoutMs?: number;
};

export type LoadResult = {
  content: SiteContent;
  source: 'supabase' | 'defaults';
  warnings: string[];
};

type Row = { section: string; data: unknown };

const ATTEMPTS = 2;

function wait(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

async function fetchRows(
  baseUrl: string,
  anonKey: string,
  options: Required<Pick<LoadOptions, 'retryDelayMs' | 'timeoutMs'>> & { fetch: typeof fetch },
): Promise<Row[]> {
  const url = `${baseUrl.replace(/\/+$/, '')}/rest/v1/site_content?select=section,data`;
  let lastError: unknown;

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await options.fetch(url, {
        headers: { apikey: anonKey },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!Array.isArray(body)) throw new Error('resposta inesperada (não é uma lista)');
      return body as Row[];
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await wait(options.retryDelayMs);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Falha ao ler o conteúdo do Supabase: ${reason}`, { cause: lastError });
}

export async function loadContent(options: LoadOptions): Promise<LoadResult> {
  const { env, now = new Date(), retryDelayMs = 1000, timeoutMs = 10_000 } = options;
  const required = env.REQUIRE_REMOTE_CONTENT === 'true';
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  const warnings: string[] = [];
  let rows: Row[] | null = null;

  if (!url && !anonKey) {
    if (required) {
      throw new Error(
        'REQUIRE_REMOTE_CONTENT=true, mas VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estão definidas.',
      );
    }
    warnings.push('Supabase não configurado: usando o conteúdo padrão.');
  } else {
    if (!url || !anonKey) {
      const missing = url ? 'VITE_SUPABASE_ANON_KEY' : 'VITE_SUPABASE_URL';
      throw new Error(`Configuração incompleta do Supabase: falta ${missing}.`);
    }
    if (!URL.canParse(url)) throw new Error('VITE_SUPABASE_URL inválida');

    try {
      rows = await fetchRows(url, anonKey, {
        fetch: options.fetch ?? globalThis.fetch,
        retryDelayMs,
        timeoutMs,
      });
    } catch (error) {
      if (required) throw error;
      warnings.push(`${(error as Error).message}. Usando o conteúdo padrão.`);
    }
  }

  const fromDatabase = new Map<string, unknown>();
  for (const row of rows ?? []) {
    if ((SECTION_KEYS as readonly string[]).includes(row.section)) {
      fromDatabase.set(row.section, row.data);
    } else {
      warnings.push(`Seção desconhecida no banco ignorada: ${row.section}`);
    }
  }

  const merged = Object.fromEntries(
    SECTION_KEYS.map((key: SectionKey) => [
      key,
      fromDatabase.has(key)
        ? mergeWithDefaults(defaultContent[key], fromDatabase.get(key))
        : defaultContent[key],
    ]),
  );

  if (rows && required) {
    const missing = SECTION_KEYS.filter((key) => !fromDatabase.has(key));
    if (missing.length > 0) {
      warnings.push(`Seções sem linha no banco (usando o padrão): ${missing.join(', ')}`);
    }
  }

  const parsed = siteContentSchema.safeParse(merged);
  if (!parsed.success) {
    throw new Error(`Conteúdo inválido:\n${formatIssues(parsed.error).join('\n')}`);
  }

  const content = resolveYear(parsed.data, now.getUTCFullYear());

  if (required) {
    const placeholders = findPlaceholders(content);
    if (placeholders.length > 0) {
      warnings.push(`Ainda há placeholders no conteúdo: ${placeholders.join(', ')}`);
    }
  }

  return { content, source: rows ? 'supabase' : 'defaults', warnings };
}
