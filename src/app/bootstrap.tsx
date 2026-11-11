import { StrictMode, type ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ContentProvider } from '@/content/ContentProvider';
import { readEmbeddedContent } from '@/content/embedded';
import { markMotionReady } from '@/site/motion/motionState';
import { SitePage } from '@/site/SitePage';
import { resolveEntry } from './resolveEntry';

function mount(rootElement: HTMLElement, node: ReactNode): () => void {
  const root = createRoot(rootElement);
  root.render(<StrictMode>{node}</StrictMode>);
  return () => root.unmount();
}

/**
 * Ponto único que decide e renderiza o app. O site público não importa nada
 * do admin; o admin (e o React Router) só é baixado em `/admin…`.
 * O site lê o conteúdo embutido no HTML (sem acessar o Supabase) e hidrata o
 * HTML pré-renderizado; com o `#root` vazio (dev), monta do zero.
 * Devolve uma função para desmontar (usada nos testes).
 */
export async function bootstrap(
  pathname: string,
  rootElement: HTMLElement | null,
  {
    hash = window.location.hash,
    leave = (url: string) => window.location.replace(url),
  }: { hash?: string; leave?: (url: string) => void } = {},
): Promise<() => void> {
  if (!rootElement) {
    throw new Error('Elemento #root não encontrado no index.html');
  }

  const entry = resolveEntry(pathname, hash);

  if (entry.kind === 'recoveryRedirect') {
    // `replace`: a página com o token não fica no histórico.
    leave(entry.to);
    return () => undefined;
  }

  if (entry.kind === 'admin') {
    const { AdminApp } = await import('@/admin/AdminApp');
    return mount(rootElement, <AdminApp />);
  }

  const content = readEmbeddedContent(document);
  if (entry.redirectTo) {
    window.history.replaceState(null, '', entry.redirectTo);
  }

  const site = (
    <ContentProvider content={content}>
      <SitePage />
    </ContentProvider>
  );

  if (rootElement.firstElementChild) {
    const root = hydrateRoot(rootElement, <StrictMode>{site}</StrictMode>);
    markMotionReady();
    return () => root.unmount();
  }
  const unmount = mount(rootElement, site);
  markMotionReady();
  return unmount;
}
