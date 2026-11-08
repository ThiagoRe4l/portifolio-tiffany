import { afterEach, describe, expect, it } from 'vitest';
import { markMotionReady, MOTION_ATTRIBUTE } from './motionState';

// Spec 002, T04 — estado "pronto para animar" (RF-21 / CA-20). O script inline do
// index.html marca `pending`; o app marca `ready` depois de hidratar.

afterEach(() => {
  document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
});

describe('markMotionReady', () => {
  it('troca pending por ready no <html>', () => {
    document.documentElement.setAttribute(MOTION_ATTRIBUTE, 'pending');

    markMotionReady();

    expect(MOTION_ATTRIBUTE).toBe('data-motion');
    expect(document.documentElement.getAttribute(MOTION_ATTRIBUTE)).toBe('ready');
  });

  it('não liga as animações se a trava de segurança já tirou o atributo', () => {
    // Sem o atributo, o JS demorou demais: o conteúdo já está visível e assim fica.
    markMotionReady();

    expect(document.documentElement.hasAttribute(MOTION_ATTRIBUTE)).toBe(false);
  });
});
