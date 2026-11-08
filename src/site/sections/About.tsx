import { useContent } from '@/content/ContentProvider';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Icon } from '../components/Icon';
import { Photo } from '../components/Photo';
import { SectionHeading } from '../components/SectionHeading';
import { cx } from '../cx';
import type { IconName } from '../icons/paths';
import motion from '../motion/motion.module.css';
import { useReveal } from '../motion/useReveal';
import styles from './About.module.css';

const EDUCATION_ICON: IconName = 'check';

/**
 * Sobre mim (spec 002, RF-06). Foto, dois parágrafos e a formação; o título da
 * formação é opcional e cada item leva um check decorativo.
 */
export function About() {
  const { sobre } = useContent();
  const reveal = useReveal<HTMLElement>();
  const headingId = headingIdFor(SECTION_IDS.sobre);

  return (
    <section id={SECTION_IDS.sobre} aria-labelledby={headingId} className={styles.about}>
      <div className={styles.inner}>
        <SectionHeading
          eyebrow={sobre.eyebrow}
          title={sobre.title}
          headingId={headingId}
          className={styles.heading}
        />

        <div ref={reveal} className={cx(styles.media, motion.reveal)}>
          <Photo photo={sobre.photo} className={styles.photo} />
        </div>

        <div className={styles.body}>
          <p ref={reveal} className={motion.reveal}>
            {sobre.text}
          </p>
          <p ref={reveal} className={cx(styles.secondary, motion.reveal)}>
            {sobre.secondaryText}
          </p>

          <div ref={reveal} className={cx(styles.education, motion.reveal)}>
            {sobre.educationTitle && (
              <h3 className={styles.educationTitle}>{sobre.educationTitle}</h3>
            )}
            <ul className={styles.list}>
              {sobre.education.map((item, index) => (
                <li key={index} className={styles.item}>
                  <Icon name={EDUCATION_ICON} size={18} className={styles.check} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
