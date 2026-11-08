import { useContent } from '@/content/ContentProvider';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { headingIdFor, hrefTo, SECTION_IDS } from '../anchors';
import { ButtonLink } from '../components/ButtonLink';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { stagger } from '../motion/stagger';
import type { IconName } from '../icons/paths';
import styles from './Hero.module.css';

/** Valores técnicos (não são texto): ícones e formato dos botões, como no design. */
const PRIMARY_ICON: IconName = 'whatsapp';
const SECONDARY_ICON: IconName = 'arrowRight';
const BADGE_ICON: IconName = 'check';
const SECONDARY_VARIANT = 'ghost';
const ICON_AFTER_TEXT = 'end';

/**
 * Início (spec 002, RF-05). Etiqueta, título, texto, botões e foto entram em
 * sequência (RF-17). A foto é o maior elemento da primeira tela: carrega com prioridade.
 */
export function Hero() {
  const { inicio, contato } = useContent();
  const headingId = headingIdFor(SECTION_IDS.inicio);
  const enter = motion.enter;

  return (
    <section id={SECTION_IDS.inicio} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={cx(styles.eyebrow, enter)} style={stagger(0)}>
            {inicio.eyebrow}
          </p>
          <h1 id={headingId} className={cx(styles.title, enter)} style={stagger(1)}>
            {inicio.title}
          </h1>
          <p className={cx(styles.text, enter)} style={stagger(2)}>
            {inicio.text}
          </p>
          <div className={cx(styles.actions, enter)} style={stagger(3)}>
            <ButtonLink
              href={buildWhatsAppLink(contato.whatsapp.number, contato.whatsapp.message)}
              external
              icon={PRIMARY_ICON}
            >
              {inicio.primaryCta}
            </ButtonLink>
            <ButtonLink
              href={hrefTo(SECTION_IDS.trabalho)}
              variant={SECONDARY_VARIANT}
              icon={SECONDARY_ICON}
              iconPosition={ICON_AFTER_TEXT}
              iconSize={18}
            >
              {inicio.secondaryCta}
            </ButtonLink>
          </div>
        </div>

        <div className={cx(styles.media, enter)} style={stagger(4)}>
          <Photo photo={inicio.photo} priority className={styles.photo} />
          <p className={styles.badge}>
            <span className={styles.badgeIcon}>
              <Icon name={BADGE_ICON} size={18} />
            </span>
            <span className={styles.badgeText}>
              <strong>{inicio.badge.title}</strong>
              <span className={styles.badgeSubtitle}>{inicio.badge.subtitle}</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
