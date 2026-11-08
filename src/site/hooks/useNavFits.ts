import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Diz se a linha do header precisa do modo compacto (spec 002, RF-04, plan D2).
 * Mede a linha e os filhos com ResizeObserver: se o conteúdo passa da largura,
 * entra no modo compacto e guarda a largura que faltou. Só sai quando a linha
 * tem espaço para essa largura (no compacto os links somem, então "caber" de novo
 * não basta e o header ficaria alternando).
 *
 * Começa `false`, igual ao HTML do build (sem diferença na hidratação).
 */
export function useNavFits(rowRef: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const requiredWidth = useRef(0);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof window.ResizeObserver !== 'function') return;

    const measure = () => {
      if (!compactRef.current) {
        if (row.scrollWidth > row.clientWidth + 1) {
          requiredWidth.current = row.scrollWidth;
          compactRef.current = true;
          setCompact(true);
        }
      } else if (row.clientWidth >= requiredWidth.current) {
        compactRef.current = false;
        setCompact(false);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    for (const child of row.children) observer.observe(child);
    measure();
    return () => observer.disconnect();
  }, [rowRef]);

  return compact;
}
