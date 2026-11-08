import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { useReveal } from '../motion/useReveal';
import styles from './SectionHeading.module.css';

export type HeadingTone = 'default' | 'onDark' | 'onSand';

/**
 * Etiqueta + título de seção (spec 002, RF-01). O tom muda só a cor da etiqueta:
 * terracota (padrão), clara sobre o verde ou terracota escura sobre areia.
 */
export function SectionHeading({
  eyebrow,
  title,
  level = 2,
  tone = 'default',
  headingId,
  className,
}: {
  eyebrow: string;
  title: string;
  level?: 1 | 2;
  tone?: HeadingTone;
  headingId?: string;
  className?: string;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  const reveal = useReveal<HTMLDivElement>();

  return (
    <div ref={reveal} className={cx(styles.heading, motion.reveal, className)} data-tone={tone}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <Heading id={headingId} className={styles.title}>
        {title}
      </Heading>
    </div>
  );
}
