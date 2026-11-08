import { useEffect, useState } from 'react';

/**
 * `true` quando a página rolou mais que `threshold` px (spec 002, RF-04). Começa
 * `false` (igual ao HTML do build) e é calculado depois de montar.
 */
export function useScrolled(threshold: number): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > threshold);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);

  return scrolled;
}
