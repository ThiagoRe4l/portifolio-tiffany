import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import {
  installIntersectionObserverMock,
  resetIntersectionObserverMock,
} from './intersectionObserver';
import { installMatchMediaMock, resetMatchMediaMock } from './matchMedia';
import { installResizeObserverMock, resetResizeObserverMock } from './resizeObserver';
import { installDialogMock } from './dialog';
import { server, startServer, takeUnhandledRequests } from './msw';

// Testes marcados com `// @vitest-environment node` (ex.: lint) não têm DOM.
const hasDom = typeof window !== 'undefined';

beforeAll(() => {
  startServer();
});

beforeEach(() => {
  if (!hasDom) return;
  installDialogMock();
  installIntersectionObserverMock();
  installMatchMediaMock();
  installResizeObserverMock();
});

afterEach(() => {
  if (hasDom) {
    cleanup();
    document.body.replaceChildren();
    resetIntersectionObserverMock();
    resetMatchMediaMock();
    resetResizeObserverMock();
  }
  server.resetHandlers();

  const unhandled = takeUnhandledRequests();
  if (unhandled.length > 0) {
    throw new Error(
      `Requisição sem handler do MSW (nenhum teste pode acessar a rede):\n${unhandled.join('\n')}`,
    );
  }
});

afterAll(() => {
  server.close();
});
