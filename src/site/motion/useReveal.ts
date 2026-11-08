import { useCallback } from 'react';

/**
 * Revelar ao rolar (spec 002, RF-18 / RF-20). Um único IntersectionObserver para a
 * página toda; cada elemento recebe `data-revealed` ao ficar 15% visível e deixa de
 * ser observado (uma vez só). O atributo vai direto no DOM, sem estado do React,
 * para não re-renderizar nem afetar a hidratação.
 *
 * Com movimento reduzido (ou sem IntersectionObserver), tudo é revelado na hora.
 */
export const REVEAL_THRESHOLD = 0.15;

const REVEALED_ATTRIBUTE = 'data-revealed';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

let observer: IntersectionObserver | null = null;
let motionQuery: MediaQueryList | null = null;
const observed = new Set<Element>();

function reveal(element: Element): void {
  element.setAttribute(REVEALED_ATTRIBUTE, '');
}

function stopObserving(element: Element): void {
  observed.delete(element);
  observer?.unobserve(element);
  if (observed.size === 0 && observer) {
    observer.disconnect();
    observer = null;
    motionQuery?.removeEventListener('change', onMotionChange);
    motionQuery = null;
  }
}

function onMotionChange(event: MediaQueryListEvent): void {
  if (!event.matches) return;
  for (const element of [...observed]) {
    reveal(element);
    stopObserving(element);
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION).matches;
}

function startObserving(element: Element): void {
  if (prefersReducedMotion() || typeof window.IntersectionObserver !== 'function') {
    reveal(element);
    return;
  }

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= REVEAL_THRESHOLD) {
            reveal(entry.target);
            stopObserving(entry.target);
          }
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );
    motionQuery = window.matchMedia(REDUCED_MOTION);
    motionQuery.addEventListener('change', onMotionChange);
  }

  observed.add(element);
  observer.observe(element);
}

/** Ref para um elemento com a classe `reveal` (motion.module.css). */
export function useReveal<T extends Element>(): (element: T | null) => (() => void) | void {
  return useCallback((element: T | null) => {
    if (!element) return;
    startObserving(element);
    return () => stopObserving(element);
  }, []);
}
