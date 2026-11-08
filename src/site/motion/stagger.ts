import type { CSSProperties } from 'react';

/** Posição do elemento na sequência (`--i`, lida por motion.module.css). */
export function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties;
}
