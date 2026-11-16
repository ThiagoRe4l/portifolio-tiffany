import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import type { Photo } from '@/content/types';
import { parseVariant, variantUrl } from '@/lib/image';
import { AdminIcon } from '../../components/AdminIcon';
import { uploadPhoto } from '../photos/photoApi';
import { PHOTO_NOTICES, photoErrorMessage } from '../photos/photoMessages';
import { ACCEPTED_TYPES, preparePhoto } from '../photos/preparePhoto';
import type { FieldNode } from '../schemaTree';
import styles from './fields.module.css';
import { TextInputField } from './TextInputField';
import type { FieldProps } from './types';

type PhotoFieldProps = Omit<FieldProps<Photo>, 'error' | 'provisional'> & {
  altError?: string | undefined;
  altProvisional?: boolean | undefined;
  /** Avisa o editor de um envio em andamento (bloqueia "Salvar e publicar"). */
  onBusyChange?: ((busy: boolean) => void) | undefined;
  /** O envio foi recusado por sessão vencida: o editor leva ao login. */
  onSessionExpired?: (() => void) | undefined;
};

type Phase = 'idle' | 'preparing' | 'uploading';

/** Miniatura: a versão menor, quando o endereço segue a regra das versões. */
function thumbnailOf(src: string): string {
  const variant = parseVariant(src);
  return variant && variant.width > 480 ? variantUrl(src, 480) : src;
}

/**
 * Foto (004, RF-11; 005, D4): miniatura, "Trocar foto" e texto alternativo. A foto é
 * preparada no aparelho e enviada antes; só vai para o site com "Salvar e publicar".
 */
export function PhotoField({
  node,
  path,
  value,
  onChange,
  altError,
  altProvisional,
  onBusyChange,
  onSessionExpired,
}: PhotoFieldProps) {
  const hintId = useId();
  const altNode = node.children?.find((child) => child.key === 'alt') as FieldNode;
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  // O aviso vale só para a foto que acabou de chegar: "Descartar" o tira.
  const [reviewFor, setReviewFor] = useState<string | null>(null);

  const report = useRef(onBusyChange);
  useEffect(() => {
    report.current = onBusyChange;
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (busy.current) report.current?.(false);
    };
  }, []);

  function setBusy(next: boolean) {
    busy.current = next;
    onBusyChange?.(next);
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpa a escolha, para o mesmo arquivo poder ser escolhido de novo.
    event.target.value = '';
    if (!file || busy.current) return;

    setError(null);
    setBusy(true);
    setPhase('preparing');
    const prepared = await preparePhoto(file);
    if (!mounted.current) return;
    if (!prepared.ok) {
      setPhase('idle');
      setBusy(false);
      setError(photoErrorMessage(prepared.kind));
      return;
    }

    setPhase('uploading');
    const uploaded = await uploadPhoto(prepared.photo);
    if (!mounted.current) return;
    setPhase('idle');
    setBusy(false);
    if (!uploaded.ok) {
      setError(photoErrorMessage(uploaded.kind));
      if (uploaded.kind === 'sessionExpired') onSessionExpired?.();
      return;
    }

    setReviewFor(uploaded.src);
    onChange({ ...value, src: uploaded.src, width: uploaded.width, height: uploaded.height });
  }

  const working = phase !== 'idle';
  const action = value.src ? 'Trocar foto' : 'Enviar foto';
  const reviewAlt = reviewFor !== null && reviewFor === value.src;
  const progress =
    phase === 'preparing'
      ? PHOTO_NOTICES.preparing
      : phase === 'uploading'
        ? PHOTO_NOTICES.uploading
        : '';

  return (
    <fieldset className={styles.group} aria-describedby={node.meta.hint ? hintId : undefined}>
      <legend className={styles.legend}>{node.meta.label}</legend>
      {node.meta.hint ? (
        <p id={hintId} className={styles.hint}>
          {node.meta.hint}
        </p>
      ) : null}
      <div className={styles.photo}>
        <div className={styles.photoRow}>
          {value.src ? (
            // Decorativa: o texto alternativo está no campo ao lado.
            <img
              className={styles.thumbnail}
              src={thumbnailOf(value.src)}
              alt=""
              width={value.width}
              height={value.height}
              loading="lazy"
            />
          ) : (
            <span className={styles.thumbnail} data-part="photo-placeholder" />
          )}
          <div className={styles.photoActions}>
            <button
              type="button"
              className={styles.photoButton}
              aria-label={`${action}: ${node.meta.label}`}
              disabled={working}
              aria-busy={working ? true : undefined}
              onClick={() => input.current?.click()}
            >
              <AdminIcon name="upload" size={18} />
              {action}
            </button>
            <p className={styles.hint}>JPG, PNG ou WebP · reduzida automaticamente</p>
            <input
              ref={input}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className={styles.fileInput}
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => void handleFile(event)}
            />
          </div>
        </div>
        <p role="status" className={styles.hint} data-part="photo-progress">
          {progress}
        </p>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <TextInputField
          node={altNode}
          path={[...path, 'alt']}
          value={value.alt}
          onChange={(alt) => {
            setReviewFor(null);
            onChange({ ...value, alt });
          }}
          error={altError}
          warning={reviewAlt ? PHOTO_NOTICES.reviewAlt : undefined}
          provisional={altProvisional}
        />
      </div>
    </fieldset>
  );
}
