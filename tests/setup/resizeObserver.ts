const activeObservers = new Set<MockResizeObserver>();

/** jsdom não tem ResizeObserver; este mock deixa o teste disparar a medição. */
class MockResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback;
  readonly #targets = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe(target: Element): void {
    this.#targets.add(target);
    activeObservers.add(this);
  }

  unobserve(target: Element): void {
    this.#targets.delete(target);
  }

  disconnect(): void {
    this.#targets.clear();
    activeObservers.delete(this);
  }

  trigger(): void {
    if (this.#targets.size === 0) return;
    const entries = [...this.#targets].map(
      (target) => ({ target, contentRect: target.getBoundingClientRect() }) as ResizeObserverEntry,
    );
    this.#callback(entries, this);
  }
}

/** Simula uma mudança de tamanho em tudo o que está sendo observado. */
export function triggerResize(): void {
  for (const observer of [...activeObservers]) observer.trigger();
}

export function installResizeObserverMock(): void {
  Object.defineProperty(window, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: MockResizeObserver,
  });
}

export function resetResizeObserverMock(): void {
  activeObservers.clear();
}
