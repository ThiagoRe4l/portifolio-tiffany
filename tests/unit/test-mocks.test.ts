import { describe, expect, it, vi } from 'vitest';
import { triggerIntersect } from '../setup/intersectionObserver';
import { setReducedMotion } from '../setup/matchMedia';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

describe('ambiente de testes', () => {
  it('roda em jsdom com os matchers do jest-dom', () => {
    const element = document.createElement('div');
    document.body.append(element);

    expect(element).toBeInTheDocument();
  });

  it('limpa o DOM entre os testes', () => {
    expect(document.body).toBeEmptyDOMElement();
  });
});

describe('mock de IntersectionObserver', () => {
  it('dispara o callback com a razão de interseção informada', () => {
    const element = document.createElement('div');
    const callback = vi.fn();
    const observer = new IntersectionObserver(callback, { threshold: 0.15 });
    observer.observe(element);

    triggerIntersect(element, 0.2);

    expect(callback).toHaveBeenCalledTimes(1);
    const [entries, receivedObserver] = callback.mock.calls[0] as [
      IntersectionObserverEntry[],
      IntersectionObserver,
    ];
    expect(receivedObserver).toBe(observer);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      target: element,
      isIntersecting: true,
      intersectionRatio: 0.2,
    });
  });

  it('expõe o threshold configurado', () => {
    const observer = new IntersectionObserver(() => {}, { threshold: 0.15 });

    expect(observer.thresholds).toEqual([0.15]);
  });

  it('informa isIntersecting falso com razão zero', () => {
    const element = document.createElement('div');
    const callback = vi.fn();
    new IntersectionObserver(callback).observe(element);

    triggerIntersect(element, 0);

    const [entries] = callback.mock.calls[0] as [IntersectionObserverEntry[]];
    expect(entries[0]?.isIntersecting).toBe(false);
  });

  it('não chama o callback depois de unobserve ou disconnect', () => {
    const first = document.createElement('div');
    const second = document.createElement('div');
    const callback = vi.fn();
    const observer = new IntersectionObserver(callback);
    observer.observe(first);
    observer.observe(second);

    observer.unobserve(first);
    triggerIntersect(first, 1);
    observer.disconnect();
    triggerIntersect(second, 1);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('mock de matchMedia', () => {
  it('começa sem movimento reduzido', () => {
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });

  it('reflete setReducedMotion e avisa os ouvintes', () => {
    const query = window.matchMedia(REDUCED_MOTION);
    const listener = vi.fn();
    query.addEventListener('change', listener);

    setReducedMotion(true);

    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(true);
    expect(query.matches).toBe(true);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ matches: true }));
  });

  it('volta ao padrão no teste seguinte', () => {
    expect(window.matchMedia(REDUCED_MOTION).matches).toBe(false);
  });

  it('responde falso para outras media queries', () => {
    setReducedMotion(true);

    expect(window.matchMedia('(min-width: 1024px)').matches).toBe(false);
  });
});
