import { defaultContent } from '@/content/defaults';
import { SECTION_KEYS } from '@/content/schema';
import { mergeWithDefaults } from '@/content/transform';
import type { SectionKey, SiteContent } from '@/content/types';
import { getSupabase } from '@/lib/supabase';

/**
 * Leitura e gravação do conteúdo pelo admin (spec 004, D4). Único lugar do editor
 * que fala com o banco; devolve resultados já classificados, sem texto do servidor.
 */

export type SaveErrorKind =
  'conflict' | 'network' | 'sessionExpired' | 'forbidden' | 'unavailable' | 'unknown';

export type SectionRecord<K extends SectionKey = SectionKey> = {
  data: SiteContent[K];
  /** Data da última gravação; `null` quando a seção ainda não tem linha no banco. */
  updatedAt: string | null;
};

export type Sections = { [K in SectionKey]: SectionRecord<K> };

export type LoadResult = { ok: true; sections: Sections } | { ok: false; kind: SaveErrorKind };
export type SaveResult = { ok: true; updatedAt: string } | { ok: false; kind: SaveErrorKind };

type Row = { section: string; data: unknown; updated_at: string };
type DbResponse = { error: { code?: string } | null; status: number };

function classify({ error, status }: DbResponse): SaveErrorKind {
  const code = error?.code;
  if (status === 0) return 'network';
  if (status === 401 || code === 'PGRST301' || code === 'PGRST303') return 'sessionExpired';
  if (status === 409 || code === '23505') return 'conflict';
  if (status === 403 || code === '42501') return 'forbidden';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

export async function loadSections(): Promise<LoadResult> {
  try {
    // Sem repetição automática: a tela oferece "Tentar novamente" (como na 003).
    const response = await getSupabase()
      .from('site_content')
      .select('section,data,updated_at')
      .retry(false);
    if (response.error) return { ok: false, kind: classify(response) };

    // Linhas de seções que não existem mais ficam de fora: só as 8 do schema são lidas.
    const rows = new Map((response.data as Row[]).map((row) => [row.section, row]));

    const sections = Object.fromEntries(
      SECTION_KEYS.map((key) => {
        const row = rows.get(key);
        // Campo novo no schema ganha o valor padrão, como no build (001).
        const data = row ? mergeWithDefaults(defaultContent[key], row.data) : defaultContent[key];
        return [key, { data, updatedAt: row?.updated_at ?? null }];
      }),
    ) as Sections;

    return { ok: true, sections };
  } catch {
    return { ok: false, kind: 'unknown' };
  }
}

/**
 * Grava a seção inteira. Com linha existente, só atualiza se ninguém gravou desde
 * que ela abriu (`expectedUpdatedAt`); sem linha, insere. Data e autor vêm do banco.
 */
export async function saveSection<K extends SectionKey>(
  section: K,
  data: SiteContent[K],
  expectedUpdatedAt: string | null,
): Promise<SaveResult> {
  try {
    const table = getSupabase().from('site_content');
    const response =
      expectedUpdatedAt === null
        ? await table.insert({ section, data }).select('updated_at').retry(false)
        : await table
            .update({ data })
            .eq('section', section)
            .eq('updated_at', expectedUpdatedAt)
            .select('updated_at')
            .retry(false);

    if (response.error) return { ok: false, kind: classify(response) };

    const [row] = (response.data ?? []) as { updated_at: string }[];
    // Nenhuma linha atualizada: a seção mudou em outro lugar.
    if (!row) return { ok: false, kind: 'conflict' };
    return { ok: true, updatedAt: row.updated_at };
  } catch {
    return { ok: false, kind: 'unknown' };
  }
}
