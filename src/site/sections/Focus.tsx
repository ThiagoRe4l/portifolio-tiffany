import { useContent } from '@/content/ContentProvider';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { SectionHeading, type HeadingTone } from '../components/SectionHeading';
import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { useReveal } from '../motion/useReveal';
import styles from './Focus.module.css';

const HEADING_TONE: HeadingTone = 'onDark';

/**
 * Área de atuação (spec 002, RF-08). Fundo verde; etiquetas de foco em pílulas e
 * blocos de público. Títulos dos grupos e texto dos blocos só aparecem se preenchidos.
 */
export function Focus() {
  const { atuacao } = useContent();
  const reveal = useReveal<HTMLElement>();
  const headingId = headingIdFor(SECTION_IDS.atuacao);

  return (
    <section id={SECTION_IDS.atuacao} aria-labelledby={headingId} className={styles.focus}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <SectionHeading
            eyebrow={atuacao.eyebrow}
            title={atuacao.title}
            tone={HEADING_TONE}
            headingId={headingId}
          />
          <p ref={reveal} className={cx(styles.text, motion.reveal)}>
            {atuacao.text}
          </p>
        </div>

        <div className={styles.details}>
          <div ref={reveal} className={cx(styles.group, motion.reveal)}>
            {atuacao.focusTitle && <h3 className={styles.groupTitle}>{atuacao.focusTitle}</h3>}
            <ul className={styles.tags}>
              {atuacao.focusTags.map((tag, index) => (
                <li key={index} className={styles.tag}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>

          <div ref={reveal} className={cx(styles.group, motion.reveal)}>
            {atuacao.audienceTitle && (
              <h3 className={styles.groupTitle}>{atuacao.audienceTitle}</h3>
            )}
            <ul className={styles.audience}>
              {atuacao.audience.map((block, index) => (
                <li key={index} className={styles.block}>
                  <p className={styles.blockTitle}>{block.title}</p>
                  {block.text && <p className={styles.blockText}>{block.text}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
