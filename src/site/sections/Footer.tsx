import { useContent } from '@/content/ContentProvider';
import { credentialLine } from '../text';
import styles from './Footer.module.css';

/** O admin é outro pacote, carregado sob demanda: link comum, com recarregamento. */
const ADMIN_LOGIN_PATH = '/admin/login';

/** Rodapé (spec 002, RF-12). Nome e CRP sempre visíveis (RF-23). */
export function Footer() {
  const { geral, contato } = useContent();

  return (
    <footer className={styles.footer} data-floating={contato.floatingButton.enabled || undefined}>
      <div className={styles.inner}>
        <div className={styles.identity}>
          <p className={styles.name}>{geral.name}</p>
          <p>{credentialLine(geral.profession, geral.crp)}</p>
          {geral.footerText && <p>{geral.footerText}</p>}
        </div>
        <div className={styles.legal}>
          <p>{geral.copyright}</p>
          <a href={ADMIN_LOGIN_PATH} className={styles.restricted}>
            {geral.restrictedAreaLink}
          </a>
        </div>
      </div>
    </footer>
  );
}
