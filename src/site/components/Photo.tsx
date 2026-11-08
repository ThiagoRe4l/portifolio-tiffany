import type { Photo as PhotoContent } from '@/content/types';
import { cx } from '../cx';
import styles from './Photo.module.css';

/**
 * Foto do conteúdo (spec 002, RF-15). Sem endereço (antes do upload da 005), vira um
 * bloco de espera com a mesma proporção, sem texto visível, nomeado pelo `alt`.
 * Forma (arco, cantos, altura) vem da seção, pela `className`.
 */
export function Photo({
  photo,
  priority = false,
  className,
}: {
  photo: PhotoContent;
  priority?: boolean;
  className?: string;
}) {
  if (!photo.src) {
    const aspectRatio = `${photo.width} / ${photo.height}`;
    return (
      <div
        role="img"
        aria-label={photo.alt}
        className={cx(styles.placeholder, className)}
        style={{ aspectRatio }}
        data-placeholder
      />
    );
  }

  return (
    <img
      className={cx(styles.photo, className)}
      src={photo.src}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
