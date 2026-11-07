/**
 * Plugin do Vite (spec 001, T10):
 * - `npm run dev`: preenche os marcadores do index.html a cada carregamento, com a
 *   mesma `prerender()` do build (conteúdo do Supabase do `.env`, ou o padrão). O
 *   React hidrata o HTML, como em produção. Erros de conteúdo aparecem no overlay.
 * - `vite preview`: reescreve `/admin/*` para `admin.html`, como o `_redirects`
 *   do Cloudflare.
 * No build, não faz nada: quem preenche o HTML é o scripts/prerender.ts.
 */
import { loadEnv, type Plugin } from 'vite';

type PrerenderEntry = {
  prerender(options: {
    env: Record<string, string | undefined>;
    template: string;
  }): Promise<{ files: Record<string, string>; warnings: string[] }>;
};

const ADMIN_PATH = /^\/admin(\/|\?|$)/;

/** `/admin`, `/admin/…` → `/admin.html`; qualquer outro caminho: `undefined`. */
export function rewriteAdminPath(url: string): string | undefined {
  return ADMIN_PATH.test(url) ? '/admin.html' : undefined;
}

export type ContentDevPluginOptions = {
  /** Variáveis usadas no dev. Padrão: as do `.env` + ambiente (testes passam as suas). */
  env?: Record<string, string | undefined>;
};

export function contentDevPlugin(options: ContentDevPluginOptions = {}): Plugin {
  const shownWarnings = new Set<string>();

  return {
    name: 'content-dev',

    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const server = ctx.server;
        if (!server) return html;

        const env =
          options.env ??
          loadEnv(server.config.mode, server.config.envDir || server.config.root, '');
        const entry = (await server.ssrLoadModule('/src/app/entry-server.tsx')) as PrerenderEntry;
        const { files, warnings } = await entry.prerender({ env, template: html });

        for (const warning of warnings) {
          if (shownWarnings.has(warning)) continue;
          shownWarnings.add(warning);
          server.config.logger.warn(`[conteúdo] ${warning}`);
        }

        const page = rewriteAdminPath(ctx.originalUrl ?? ctx.path) ? 'admin.html' : 'index.html';
        return files[page] ?? html;
      },
    },

    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const target = req.url ? rewriteAdminPath(req.url) : undefined;
        if (target) req.url = target;
        next();
      });
    },
  };
}
