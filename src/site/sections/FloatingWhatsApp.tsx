import { useContent } from '@/content/ContentProvider';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { ButtonLink } from '../components/ButtonLink';
import { cx } from '../cx';
import type { IconName } from '../icons/paths';
import motion from '../motion/motion.module.css';
import styles from './FloatingWhatsApp.module.css';

const ICON: IconName = 'whatsapp';
const PART = 'floating';

/**
 * Botão flutuante do WhatsApp (spec 002, RF-13). Mobile: só o ícone, com o texto
 * escondido dando o nome acessível. A partir de 1024px: ícone e texto.
 */
export function FloatingWhatsApp() {
  const { contato } = useContent();
  const { floatingButton, whatsapp } = contato;
  if (!floatingButton.enabled) return null;

  return (
    <ButtonLink
      href={buildWhatsAppLink(whatsapp.number, whatsapp.message)}
      external
      icon={ICON}
      iconSize={28}
      className={cx(styles.floating, motion.pop)}
      part={PART}
    >
      <span className={styles.label}>{floatingButton.text}</span>
    </ButtonLink>
  );
}
