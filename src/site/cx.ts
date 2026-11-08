/** Junta classes CSS, ignorando valores vazios. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Classe global de src/styles/global.css (texto só para leitores de tela). */
export const VISUALLY_HIDDEN = 'visually-hidden';

/** Classe global do link "pular para o conteúdo". */
export const SKIP_LINK = 'skip-link';
