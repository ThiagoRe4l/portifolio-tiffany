import type { ReactNode } from 'react';
import { a11yLabels } from '../a11yLabels';
import { cx, VISUALLY_HIDDEN } from '../cx';
import type { IconName } from '../icons/paths';
import { Icon } from './Icon';
import styles from './ButtonLink.module.css';

export type ButtonVariant = 'primary' | 'ghost';

/**
 * Botão com cara de botão que é um link (spec 002, RF-14). `external` abre em nova
 * aba, com `rel` seguro, e avisa isso a leitores de tela (a11yLabels.newTab).
 */
export function ButtonLink({
  href,
  children,
  variant = 'primary',
  external = false,
  icon,
  iconPosition = 'start',
  iconSize = 20,
  className,
  ariaLabel,
  part,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  external?: boolean;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  iconSize?: number;
  className?: string;
  ariaLabel?: string;
  /** `data-part`, para a seção identificar o botão (CSS e testes). */
  part?: string;
}) {
  const iconElement = icon ? <Icon name={icon} size={iconSize} /> : null;
  const label = ariaLabel && external ? `${ariaLabel} ${a11yLabels.newTab}` : ariaLabel;
  const newTab = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <a
      href={href}
      className={cx(styles.button, className)}
      data-variant={variant}
      data-part={part}
      aria-label={label}
      {...newTab}
    >
      {iconPosition === 'start' && iconElement}
      <span>{children}</span>
      {/* O espaço fica fora do span escondido, para o nome acessível separar as palavras. */}
      {external && ' '}
      {external && <span className={VISUALLY_HIDDEN}>{a11yLabels.newTab}</span>}
      {iconPosition === 'end' && iconElement}
    </a>
  );
}
