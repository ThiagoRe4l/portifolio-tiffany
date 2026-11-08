import { a11yLabels } from './a11yLabels';
import { hrefTo, MAIN_ID } from './anchors';
import { SKIP_LINK } from './cx';
import { About } from './sections/About';
import { Contact } from './sections/Contact';
import { FloatingWhatsApp } from './sections/FloatingWhatsApp';
import { Focus } from './sections/Focus';
import { Footer } from './sections/Footer';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { HowItWorks } from './sections/HowItWorks';
import { Space } from './sections/Space';
import { Work } from './sections/Work';
import styles from './SitePage.module.css';

/** Página do site público (spec 002, RF-01). O `tabIndex` deixa o "pular" focar o `main`. */
export function SitePage() {
  return (
    <>
      <a href={hrefTo(MAIN_ID)} className={SKIP_LINK}>
        {a11yLabels.skipToContent}
      </a>
      <Header />
      <main id={MAIN_ID} className={styles.main} tabIndex={-1}>
        <Hero />
        <About />
        <Work />
        <Focus />
        <HowItWorks />
        <Space />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
