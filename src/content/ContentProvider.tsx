import { createContext, useContext, type ReactNode } from 'react';
import type { SiteContent } from './types';

/** Conteúdo tipado para os componentes do site (spec 001, RF-13). */
const ContentContext = createContext<SiteContent | null>(null);

export function ContentProvider({
  content,
  children,
}: {
  content: SiteContent;
  children: ReactNode;
}) {
  return <ContentContext value={content}>{children}</ContentContext>;
}

export function useContent(): SiteContent {
  const content = useContext(ContentContext);
  if (!content) {
    throw new Error('useContent precisa estar dentro de <ContentProvider>');
  }
  return content;
}
