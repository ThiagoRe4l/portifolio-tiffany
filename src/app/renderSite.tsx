import { renderToString } from 'react-dom/server';
import { ContentProvider } from '@/content/ContentProvider';
import type { SiteContent } from '@/content/types';
import { SitePage } from '@/site/SitePage';

/**
 * HTML do site para a pré-renderização (spec 001, RF-11). A mesma árvore é
 * hidratada no navegador (`bootstrap`), por isso precisa ser idêntica.
 */
export function renderSite(content: SiteContent): string {
  return renderToString(
    <ContentProvider content={content}>
      <SitePage />
    </ContentProvider>,
  );
}
