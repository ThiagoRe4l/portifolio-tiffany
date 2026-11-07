const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa texto para conteúdo de tag e valores de atributo. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export const TEMPLATE_MARKERS = {
  head: '<!--app-head-->',
  html: '<!--app-html-->',
  data: '<!--app-data-->',
} as const;

/**
 * Troca os marcadores do index.html. Usa split/join (não `replace` com string),
 * para `$&`, `$1` etc. no conteúdo não virarem padrões de substituição.
 */
export function injectIntoTemplate(
  template: string,
  parts: Record<keyof typeof TEMPLATE_MARKERS, string>,
): string {
  let html = template;
  for (const key of Object.keys(TEMPLATE_MARKERS) as (keyof typeof TEMPLATE_MARKERS)[]) {
    const marker = TEMPLATE_MARKERS[key];
    if (!html.includes(marker)) throw new Error(`Marcador ${marker} não encontrado no template`);
    html = html.split(marker).join(parts[key]);
  }
  return html;
}
