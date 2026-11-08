import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { triggerIntersect } from '../../../tests/setup/intersectionObserver';
import { setReducedMotion } from '../../../tests/setup/matchMedia';
import { REVEAL_THRESHOLD, useReveal } from './useReveal';

// Spec 002, T04 — revelar ao rolar (RF-18 / CA-17) e movimento reduzido (RF-20 / CA-19,
// teste obrigatório do projeto). Usa os mocks de IntersectionObserver e matchMedia da 000.

let created: IntersectionObserver[] = [];
let disconnected = 0;

beforeEach(() => {
  created = [];
  disconnected = 0;
  const Base = window.IntersectionObserver;
  class Counting extends Base {
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      super(callback, options);
      created.push(this);
    }
    override disconnect(): void {
      disconnected += 1;
      super.disconnect();
    }
  }
  window.IntersectionObserver = Counting;
});

function Box({ id }: { id: string }) {
  const ref = useReveal<HTMLDivElement>();
  return <div ref={ref} data-testid={id} />;
}

const box = (id = 'a') => screen.getByTestId(id);
const isRevealed = (element: Element) => element.hasAttribute('data-revealed');

describe('useReveal', () => {
  it('observa com limiar de 15% e não revela antes disso', () => {
    render(<Box id="a" />);

    expect(REVEAL_THRESHOLD).toBe(0.15);
    expect(created).toHaveLength(1);
    expect(created[0]?.thresholds).toEqual([0.15]);
    expect(isRevealed(box())).toBe(false);

    act(() => triggerIntersect(box(), 0.1));
    expect(isRevealed(box())).toBe(false);
  });

  it('revela ao cruzar 15%, uma única vez', () => {
    render(<Box id="a" />);

    act(() => triggerIntersect(box(), 0.15));
    expect(isRevealed(box())).toBe(true);

    // Sai e volta: nada muda, porque o elemento deixou de ser observado.
    box().removeAttribute('data-revealed');
    act(() => {
      triggerIntersect(box(), 0);
      triggerIntersect(box(), 0.8);
    });
    expect(isRevealed(box())).toBe(false);
  });

  it('usa um único observer para vários elementos', () => {
    render(
      <>
        <Box id="a" />
        <Box id="b" />
        <Box id="c" />
      </>,
    );

    expect(created).toHaveLength(1);
    act(() => triggerIntersect(box('b'), 0.5));
    expect(isRevealed(box('a'))).toBe(false);
    expect(isRevealed(box('b'))).toBe(true);
    expect(isRevealed(box('c'))).toBe(false);
  });

  it('desliga o observer quando não sobra nenhum elemento', () => {
    const { unmount } = render(<Box id="a" />);

    unmount();

    expect(disconnected).toBe(1);
  });

  it('com movimento reduzido, revela tudo na hora e não cria observer', () => {
    setReducedMotion(true);

    render(<Box id="a" />);

    expect(isRevealed(box())).toBe(true);
    expect(created).toHaveLength(0);
  });

  it('se o movimento reduzido for ligado no meio da visita, revela o que faltava', () => {
    render(
      <>
        <Box id="a" />
        <Box id="b" />
      </>,
    );
    act(() => triggerIntersect(box('a'), 0.5));

    act(() => setReducedMotion(true));

    expect(isRevealed(box('a'))).toBe(true);
    expect(isRevealed(box('b'))).toBe(true);
  });

  it('sem IntersectionObserver (navegador antigo), revela tudo na hora', () => {
    Reflect.deleteProperty(window, 'IntersectionObserver');

    render(<Box id="a" />);

    expect(isRevealed(box())).toBe(true);
  });
});
