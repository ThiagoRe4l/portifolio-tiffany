import { useContent } from '@/content/ContentProvider';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { SectionHeading } from '../components/SectionHeading';
import { cx } from '../cx';
import motion from '../motion/motion.module.css';
import { stagger } from '../motion/stagger';
import { useReveal } from '../motion/useReveal';
import { stepNumbers } from '../text';
import styles from './HowItWorks.module.css';

/**
 * Como funciona (spec 002, RF-09). Lista ordenada; o número vem da posição e é
 * decorativo. Os dois formatos ficam no HTML e o CSS escolhe: círculo "1" no
 * mobile, "01" grande com linha em cima a partir de 1024px (plan D6).
 */
export function HowItWorks() {
  const { comoFunciona } = useContent();
  const reveal = useReveal<HTMLLIElement>();
  const headingId = headingIdFor(SECTION_IDS.comoFunciona);

  return (
    <section id={SECTION_IDS.comoFunciona} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <SectionHeading
          eyebrow={comoFunciona.eyebrow}
          title={comoFunciona.title}
          headingId={headingId}
        />
        <ol className={styles.steps}>
          {comoFunciona.steps.map((step, index) => {
            const { short, padded } = stepNumbers(index);
            return (
              <li
                key={index}
                ref={reveal}
                className={cx(styles.step, motion.reveal)}
                style={stagger(index)}
              >
                <span className={styles.circle} aria-hidden="true">
                  {short}
                </span>
                <span className={styles.large} aria-hidden="true">
                  {padded}
                </span>
                <div className={styles.body}>
                  <h3 className={styles.title}>{step.title}</h3>
                  <p className={styles.text}>{step.text}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
