const activeObservers = new Set<MockIntersectionObserver>();

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly scrollMargin: string;
  readonly thresholds: ReadonlyArray<number>;
  readonly #callback: IntersectionObserverCallback;
  readonly #targets = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.#callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.scrollMargin = options.scrollMargin ?? '0px';
    const threshold = options.threshold ?? 0;
    this.thresholds = Array.isArray(threshold) ? [...threshold] : [threshold];
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

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  trigger(target: Element, ratio: number): void {
    if (!this.#targets.has(target)) return;

    const rect = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting: ratio > 0,
      intersectionRatio: ratio,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: performance.now(),
    };
    this.#callback([entry], this);
  }
}

/** Simula o elemento `target` ficando `ratio` (0 a 1) visível na tela. */
export function triggerIntersect(target: Element, ratio: number): void {
  for (const observer of [...activeObservers]) {
    observer.trigger(target, ratio);
  }
}

export function installIntersectionObserverMock(): void {
  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });
}

export function resetIntersectionObserverMock(): void {
  activeObservers.clear();
}
