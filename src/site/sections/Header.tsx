import { useRef } from 'react';
import { useContent } from '@/content/ContentProvider';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { a11yLabels } from '../a11yLabels';
import { hrefTo, MENU_TARGETS, SECTION_IDS } from '../anchors';
import { ButtonLink } from '../components/ButtonLink';
import { Icon } from '../components/Icon';
import { useMenu } from '../hooks/useMenu';
import { useNavFits } from '../hooks/useNavFits';
import { useScrolled } from '../hooks/useScrolled';
import { credentialLine } from '../text';
import {
  HEADER_PART,
  MENU_KEYS,
  MENU_PANEL_ID,
  NAV_COMPACT,
  SCROLL_THRESHOLD,
} from './headerParts';
import styles from './Header.module.css';

/**
 * Header fixo (spec 002, RF-04). O que aparece por largura é decidido no CSS:
 * < 768 marca + menu; 768–1279 + botão do topo; ≥ 1280 os 6 links (se couberem).
 */
export function Header() {
  const { geral, contato } = useContent();
  const rowRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(SCROLL_THRESHOLD);
  const compact = useNavFits(rowRef);
  const { open: menuOpen, toggle, buttonRef, panelRef, closeFromLink } = useMenu();

  const whatsappHref = buildWhatsAppLink(contato.whatsapp.number, contato.whatsapp.message);
  const menuIcon = menuOpen ? 'close' : 'menu';
  const menuLabel = menuOpen ? a11yLabels.closeMenu : a11yLabels.openMenu;
  const links = (onClick?: () => void) =>
    MENU_KEYS.map((key) => (
      <li key={key}>
        <a href={hrefTo(MENU_TARGETS[key])} onClick={onClick}>
          {geral.menu[key]}
        </a>
      </li>
    ));

  return (
    <header
      className={styles.header}
      data-scrolled={scrolled || undefined}
      data-nav={compact ? NAV_COMPACT : undefined}
    >
      <div ref={rowRef} className={styles.row} data-part={HEADER_PART.row}>
        <a href={hrefTo(SECTION_IDS.inicio)} className={styles.brand} data-part={HEADER_PART.brand}>
          <span className={styles.monogram} aria-hidden="true">
            {geral.initials}
          </span>
          <span className={styles.identity}>
            <span className={styles.name}>{geral.name}</span>
            <span className={styles.credential}>{credentialLine(geral.profession, geral.crp)}</span>
          </span>
        </a>

        <nav aria-label={a11yLabels.menu} className={styles.nav} data-part={HEADER_PART.desktopNav}>
          <ul>{links()}</ul>
        </nav>

        <ButtonLink href={whatsappHref} external className={styles.cta} part={HEADER_PART.cta}>
          {geral.headerCta}
        </ButtonLink>

        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          data-part={HEADER_PART.menuButton}
          aria-expanded={menuOpen}
          aria-controls={MENU_PANEL_ID}
          aria-label={menuLabel}
          onClick={toggle}
        >
          <Icon name={menuIcon} />
        </button>
      </div>

      <div
        id={MENU_PANEL_ID}
        ref={panelRef}
        className={styles.panel}
        data-part={HEADER_PART.menuPanel}
        hidden={!menuOpen}
      >
        <nav aria-label={a11yLabels.menu}>
          <ul className={styles.panelLinks}>{links(closeFromLink)}</ul>
          <ButtonLink href={whatsappHref} external className={styles.panelCta}>
            {geral.headerCta}
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
