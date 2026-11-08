import type { ReactNode } from 'react';
import { useContent } from '@/content/ContentProvider';
import { instagramUrl, mailtoUrl, telUrl } from '@/lib/contactLinks';
import { formatPhoneBR } from '@/lib/phone';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { headingIdFor, SECTION_IDS } from '../anchors';
import { ButtonLink, type ButtonVariant } from '../components/ButtonLink';
import { Icon } from '../components/Icon';
import { SectionHeading, type HeadingTone } from '../components/SectionHeading';
import { cx } from '../cx';
import type { IconName } from '../icons/paths';
import motion from '../motion/motion.module.css';
import { useReveal } from '../motion/useReveal';
import styles from './Contact.module.css';

/** Valores técnicos (não são texto). A etiqueta fica sobre areia no desktop. */
const HEADING_TONE: HeadingTone = 'onSand';
const CHANNEL_VARIANT: ButtonVariant = 'ghost';
const LINE_ROLE = 'group';
const CHANNELS_PART = 'channels';
const ICON = {
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  email: 'email',
  phone: 'phone',
  address: 'mapPin',
  hours: 'clock',
} satisfies Record<string, IconName>;

/** Linha de informação: ícone + conteúdo, nomeada para leitores de tela (RF-11). */
function InfoLine({
  icon,
  label,
  className,
  children,
}: {
  icon: IconName;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={LINE_ROLE} aria-label={label} className={cx(styles.line, className)}>
      <Icon name={icon} size={20} className={styles.lineIcon} />
      {children}
    </div>
  );
}

/**
 * Contato (spec 002, RF-11). Cada canal opcional só existe se estiver preenchido.
 * O telefone tem dois formatos no HTML e o CSS escolhe: cartão "Ligar" no mobile e
 * linha com o número a partir de 1024px (plan D5).
 */
export function Contact() {
  const { contato } = useContent();
  const reveal = useReveal<HTMLElement>();
  const { whatsapp, instagram, email, phone, address, hours, map } = contato;
  const headingId = headingIdFor(SECTION_IDS.contato);
  const hasChannels = Boolean(instagram.handle || email.address || phone.number);

  return (
    <section id={SECTION_IDS.contato} aria-labelledby={headingId}>
      <div className={styles.inner}>
        <div className={styles.card} data-map={map.embedUrl ? true : undefined}>
          <div className={styles.copy}>
            <SectionHeading
              eyebrow={contato.eyebrow}
              title={contato.title}
              tone={HEADING_TONE}
              headingId={headingId}
            />
            <p ref={reveal} className={cx(styles.text, motion.reveal)}>
              {contato.text}
            </p>

            <div ref={reveal} className={cx(styles.actions, motion.reveal)}>
              <ButtonLink
                href={buildWhatsAppLink(whatsapp.number, whatsapp.message)}
                external
                icon={ICON.whatsapp}
                className={styles.whatsapp}
              >
                {whatsapp.buttonText}
              </ButtonLink>

              {hasChannels && (
                <div className={styles.channels} data-part={CHANNELS_PART}>
                  {instagram.handle && (
                    <ButtonLink
                      href={instagramUrl(instagram.handle)}
                      external
                      variant={CHANNEL_VARIANT}
                      icon={ICON.instagram}
                      iconSize={22}
                      className={styles.channel}
                    >
                      {instagram.buttonText}
                    </ButtonLink>
                  )}
                  {email.address && (
                    <ButtonLink
                      href={mailtoUrl(email.address)}
                      variant={CHANNEL_VARIANT}
                      icon={ICON.email}
                      iconSize={22}
                      className={styles.channel}
                    >
                      {email.buttonText}
                    </ButtonLink>
                  )}
                  {phone.number && (
                    <ButtonLink
                      href={telUrl(phone.number)}
                      variant={CHANNEL_VARIANT}
                      icon={ICON.phone}
                      iconSize={22}
                      className={cx(styles.channel, styles.callCard)}
                    >
                      {phone.buttonText}
                    </ButtonLink>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.info}>
            <div ref={reveal} className={cx(styles.lines, motion.reveal)}>
              <InfoLine icon={ICON.address} label={address.title}>
                <span className={styles.lineText}>{address.text}</span>
              </InfoLine>
              {phone.number && (
                <InfoLine icon={ICON.phone} label={phone.buttonText} className={styles.phoneLine}>
                  <a href={telUrl(phone.number)} className={styles.phoneLink}>
                    {formatPhoneBR(phone.number)}
                  </a>
                </InfoLine>
              )}
              <InfoLine icon={ICON.hours} label={hours.title}>
                <span className={styles.lineText}>{hours.text}</span>
              </InfoLine>
            </div>

            {map.embedUrl && (
              <iframe
                ref={reveal}
                className={cx(styles.map, motion.reveal)}
                src={map.embedUrl}
                title={map.title}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
