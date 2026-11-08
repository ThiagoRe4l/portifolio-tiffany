import { useCallback, useEffect, useRef, useState } from 'react';

const MENU_OPEN_ATTRIBUTE = 'data-menu-open';

/**
 * Menu do header (spec 002, RF-04): padrão "disclosure". Ao abrir, o foco vai ao
 * primeiro link e a rolagem da página trava; Esc fecha e devolve o foco ao botão;
 * escolher um link fecha; se a tela cresce e o botão some, fecha.
 */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  const toggle = useCallback(() => setOpen((value) => !value), []);

  /** Escolher um link do painel fecha o menu (o foco segue para a âncora). */
  const closeFromLink = useCallback(() => close(false), [close]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute(MENU_OPEN_ATTRIBUTE, '');
    panelRef.current?.querySelector('a')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onResize = () => {
      const button = buttonRef.current;
      if (button && getComputedStyle(button).display === 'none') close(false);
    };

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      root.removeAttribute(MENU_OPEN_ATTRIBUTE);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  return { open, toggle, buttonRef, panelRef, closeFromLink };
}
