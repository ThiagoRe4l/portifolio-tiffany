import type { SiteContent } from './types';

/**
 * Conteúdo embutido no HTML (spec 001, RF-12):
 * `<script id="site-content" type="application/json">…</script>`.
 * O build serializa; o navegador lê daqui, sem acessar o Supabase e sem Zod
 * (o conteúdo já foi validado no build).
 */
export const EMBEDDED_CONTENT_ID = 'site-content';

// `<`, `>` e `&` impedem fechar o <script> ou abrir comentário; U+2028/U+2029
// quebram JavaScript antigo. Todos viram escapes \uXXXX, que o JSON.parse desfaz.
const UNSAFE = new RegExp(`[<>&${String.fromCharCode(0x2028, 0x2029)}]`, 'g');
const BACKSLASH_U = '\\' + 'u';

function escapeChar(char: string): string {
  return BACKSLASH_U + char.charCodeAt(0).toString(16).padStart(4, '0');
}

/** JSON seguro para colocar dentro de um `<script>` (também usado no JSON-LD). */
export function serializeForScript(value: unknown): string {
  return JSON.stringify(value).replace(UNSAFE, escapeChar);
}

export function serializeEmbeddedContent(content: SiteContent): string {
  return serializeForScript(content);
}

export function readEmbeddedContent(doc: Document = document): SiteContent {
  const script = doc.getElementById(EMBEDDED_CONTENT_ID);
  if (!script) {
    throw new Error(`Conteúdo do site não encontrado (#${EMBEDDED_CONTENT_ID}). O build rodou?`);
  }
  try {
    return JSON.parse(script.textContent ?? '') as SiteContent;
  } catch (error) {
    throw new Error(`Conteúdo embutido inválido (#${EMBEDDED_CONTENT_ID})`, { cause: error });
  }
}
