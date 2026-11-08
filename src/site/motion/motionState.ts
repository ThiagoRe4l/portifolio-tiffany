/**
 * Estado "pronto para animar" (spec 002, plan D1). O script inline do index.html
 * marca `<html data-motion="pending">` antes da primeira pintura; o app marca
 * `ready` depois de hidratar. O CSS só esconde conteúdo sob `[data-motion]`, e a
 * trava de 3 s do script tira o atributo se o app não ficar pronto.
 */
export const MOTION_ATTRIBUTE = 'data-motion';

export function markMotionReady(root: HTMLElement = document.documentElement): void {
  // Sem o atributo, a trava já liberou o conteúdo: não religa as animações.
  if (root.hasAttribute(MOTION_ATTRIBUTE)) root.setAttribute(MOTION_ATTRIBUTE, 'ready');
}
