import { useContent } from '@/content/ContentProvider';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { Photo } from '../components/Photo';
import { SectionHeading } from '../components/SectionHeading';
import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { stagger } from '../motion/stagger';
import { useReveal } from '../motion/useReveal';
import styles from './Space.module.css';

/**
 * O espaço (spec 002, RF-10). De 1 a 9 fotos: no mobile, a primeira grande e as
 * próximas em pares; a partir de 1024px, 3 colunas. A legenda é opcional.
 */
export function Space() {
  const { espaco } = useContent();
  const reveal = useReveal<HTMLLIElement>();
  const headingId = headingIdFor(SECTION_IDS.espaco);

  return (
    <section id={SECTION_IDS.espaco} aria-labelledby={headingId} className={styles.space}>
      <div className={styles.inner}>
        <SectionHeading eyebrow={espaco.eyebrow} title={espaco.title} headingId={headingId} />
        <ul className={styles.gallery}>
          {espaco.photos.map(({ photo, caption }, index) => (
            <li
              key={index}
              ref={reveal}
              className={cx(styles.item, motion.reveal)}
              style={stagger(index)}
            >
              <figure>
                <div className={cx(styles.frame, motion.zoom)}>
                  <Photo photo={photo} className={styles.photo} />
                </div>
                {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
