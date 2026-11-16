import type { Photo as PhotoContent } from '@/content/types';
import { srcSetFor } from '@/lib/image';
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
  sizes = '100vw',
  className,
}: {
  photo: PhotoContent;
  priority?: boolean;
  /** Largura exibida em cada tela (spec 005); sem ele, a tela toda. */
  sizes?: string;
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

  // Versões de 480, 960 e 1600 px pela regra dos nomes (spec 005); endereço de fora, sem.
  const srcSet = srcSetFor(photo.src);

  return (
    <img
      className={cx(styles.photo, className)}
      src={photo.src}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      width={photo.width}
      height={photo.height}
      alt={photo.alt}
      decoding="async"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
