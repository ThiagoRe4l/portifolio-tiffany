import { useContent } from '@/content/ContentProvider';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Icon } from '../components/Icon';
import { SectionHeading } from '../components/SectionHeading';
import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { stagger } from '../motion/stagger';
import { useReveal } from '../motion/useReveal';
import styles from './Work.module.css';

/**
 * Meu trabalho (spec 002, RF-07). De 1 a 8 cards: um por linha no mobile, grade
 * automática a partir de 768px. O `li` leva a sequência; o card, o hover (RF-19).
 */
export function Work() {
  const { trabalho } = useContent();
  const reveal = useReveal<HTMLLIElement>();
  const headingId = headingIdFor(SECTION_IDS.trabalho);

  return (
    <section id={SECTION_IDS.trabalho} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <SectionHeading
          eyebrow={trabalho.eyebrow}
          title={trabalho.title}
          headingId={headingId}
          className={styles.heading}
        />
        <ul className={styles.grid}>
          {trabalho.cards.map((card, index) => (
            <li key={index} ref={reveal} className={motion.reveal} style={stagger(index)}>
              <article className={cx(styles.card, motion.lift)}>
                <span className={styles.iconBox}>
                  <Icon name={card.icon} />
                </span>
                <h3 className={styles.title}>{card.title}</h3>
                <p className={styles.text}>{card.text}</p>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
