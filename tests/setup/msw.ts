import { setupServer } from 'msw/node';

/**
 * Servidor MSW compartilhado. Começa sem handlers: cada teste registra os seus
 * com `server.use(...)`, e eles são removidos ao fim do teste.
 */
export const server = setupServer();

const unhandledRequests: string[] = [];

function describeFrame(frame: { protocol: string; data: unknown }): string {
  if (frame.protocol === 'http') {
    const { request } = frame.data as { request: Request };
    return `${request.method} ${request.url}`;
  }
  return `${frame.protocol} (frame sem handler)`;
}

export function startServer(): void {
  server.listen({
    onUnhandledFrame({ frame, defaults }) {
      unhandledRequests.push(describeFrame(frame));
      defaults.error();
    },
  });
}

/** Devolve e limpa a lista de requisições que chegaram sem handler. */
export function takeUnhandledRequests(): string[] {
  return unhandledRequests.splice(0);
}
