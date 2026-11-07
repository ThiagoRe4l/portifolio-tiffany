import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
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
 * Devolve uma função para desmontar (usada nos testes).
 */
export async function bootstrap(
  pathname: string,
  rootElement: HTMLElement | null,
): Promise<() => void> {
  if (!rootElement) {
    throw new Error('Elemento #root não encontrado no index.html');
  }

  const entry = resolveEntry(pathname);

  if (entry.kind === 'admin') {
    const { AdminApp } = await import('@/admin/AdminApp');
    return mount(rootElement, <AdminApp />);
  }

  if (entry.redirectTo) {
    window.history.replaceState(null, '', entry.redirectTo);
  }
  return mount(rootElement, <SitePage />);
}
