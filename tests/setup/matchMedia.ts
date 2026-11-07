let reducedMotion = false;
const liveQueries = new Set<MockMediaQueryList>();

function evaluate(media: string): boolean {
  const normalized = media.replace(/\s+/g, '').toLowerCase();
  if (normalized === '(prefers-reduced-motion:reduce)') return reducedMotion;
  if (normalized === '(prefers-reduced-motion:no-preference)') return !reducedMotion;
  return false;
}

class MockMediaQueryList extends EventTarget {
  readonly media: string;
  onchange: ((this: MediaQueryList, event: MediaQueryListEvent) => unknown) | null = null;
  #lastValue: boolean;

  constructor(media: string) {
    super();
    this.media = media;
    this.#lastValue = evaluate(media);
  }

  get matches(): boolean {
    return evaluate(this.media);
  }

  /** API antiga, ainda usada por algumas bibliotecas. */
  addListener(listener: EventListener): void {
    this.addEventListener('change', listener);
  }

  removeListener(listener: EventListener): void {
    this.removeEventListener('change', listener);
  }

  notifyIfChanged(): void {
    const current = this.matches;
    if (current === this.#lastValue) return;
    this.#lastValue = current;

    const event = Object.assign(new Event('change'), { matches: current, media: this.media });
    this.onchange?.call(this as unknown as MediaQueryList, event as unknown as MediaQueryListEvent);
    this.dispatchEvent(event);
  }
}

/** Liga ou desliga `prefers-reduced-motion: reduce` e avisa quem estiver ouvindo. */
export function setReducedMotion(value: boolean): void {
  reducedMotion = value;
  for (const query of liveQueries) query.notifyIfChanged();
}

export function installMatchMediaMock(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (media: string): MediaQueryList => {
      const query = new MockMediaQueryList(media);
      liveQueries.add(query);
      return query as unknown as MediaQueryList;
    },
  });
}

export function resetMatchMediaMock(): void {
  reducedMotion = false;
  liveQueries.clear();
}
