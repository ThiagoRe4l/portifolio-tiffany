import type { ClipboardEvent, InputHTMLAttributes } from 'react';
import type { FieldKind } from '@/content/fields';
import { TextField } from '../../components/TextField';
import { singleLine } from '../normalize';
import { pathKey } from '../validation';
import { asText, PROVISIONAL_WARNING, type FieldProps } from './types';

/** Teclado e correções certos para cada tipo de texto de uma linha (RF-10). */
const INPUT_BY_KIND: Partial<Record<FieldKind, InputHTMLAttributes<HTMLInputElement>>> = {
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'off' },
  instagram: { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false },
  email: { type: 'email', inputMode: 'email', autoCapitalize: 'none' },
  mapUrl: { type: 'url', inputMode: 'url', autoCapitalize: 'none' },
};

/** A dica do schema mostra o formato gravado; aqui ela digita do jeito dela (normalize.ts). */
const PHONE_HINT = 'Com DDD. Ex.: (11) 99999-8888';

export function TextInputField({ node, path, value, onChange, error, provisional }: FieldProps) {
  const text = asText(value);

  // O navegador apagaria as quebras coladas, juntando as palavras: viram espaço.
  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text');
    if (!/[\r\n]/.test(pasted)) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? start;
    onChange(text.slice(0, start) + singleLine(pasted) + text.slice(end));
  }

  return (
    <TextField
      {...INPUT_BY_KIND[node.kind]}
      label={node.meta.label}
      hint={node.kind === 'phone' ? PHONE_HINT : node.meta.hint}
      warning={provisional ? PROVISIONAL_WARNING : undefined}
      error={error}
      max={node.kind === 'text' ? node.meta.max : undefined}
      value={text}
      onChange={onChange}
      onPaste={handlePaste}
      data-field-path={pathKey(path)}
    />
  );
}
