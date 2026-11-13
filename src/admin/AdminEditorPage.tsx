import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { SECTION_KEYS, sectionSchemas } from '@/content/schema';
import type { SectionKey } from '@/content/types';
import { useAuth } from './auth/AuthProvider';
import styles from './AdminEditorPage.module.css';
import buttonStyles from './components/SubmitButton.module.css';
import { ActionBar } from './editor/ActionBar';
import { ConfirmDialog } from './editor/ConfirmDialog';
import { loadSections, saveSection } from './editor/contentApi';
import { EditorHeader } from './editor/EditorHeader';
import { EDITOR_NOTICES } from './editor/editorMessages';
import {
  currentValue,
  editorReducer,
  initialEditorState,
  sectionIsDirty,
  TREES,
} from './editor/editorState';
import { formatPublished, latestUpdate } from './editor/format';
import { leaveTo } from './editor/leave';
import { normalizeSection } from './editor/normalize';
import { SectionForm } from './editor/SectionForm';
import { SectionPicker } from './editor/SectionPicker';
import { Toast } from './editor/Toast';
import { placeholderPaths, validateSection } from './editor/validation';

const isSectionKey = (value: string | null): value is SectionKey =>
  (SECTION_KEYS as readonly (string | null)[]).includes(value);

const EMPTY_ERRORS = new Map<string, string>();

/** O que espera a confirmação de descartar as alterações (RF-20). */
type PendingAction =
  | { kind: 'section'; to: SectionKey }
  | { kind: 'discard' }
  | { kind: 'viewSite' }
  | { kind: 'signOut' };

const fieldsNeedingFix = (count: number) =>
  count === 1 ? '1 campo precisa de ajuste.' : `${count} campos precisam de ajuste.`;

/** Primeiro campo com erro, na ordem da tela; num grupo de lista, o primeiro controle dele. */
function focusFirstError(root: HTMLElement | null, errors: ReadonlyMap<string, string>) {
  if (!root) return;
  const first = [...root.querySelectorAll<HTMLElement>('[data-field-path]')].find((element) =>
    errors.has(element.dataset.fieldPath ?? ''),
  );
  const target =
    first instanceof HTMLFieldSetElement
      ? first.querySelector<HTMLElement>('input, textarea, select, button')
      : first;
  target?.focus();
}

/** Editor do conteúdo (spec 004): seletor de seção, formulário e "Salvar e publicar". */
export function AdminEditorPage() {
  const { signOut, expireSession, setUnsavedChanges } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('secao');
  const section: SectionKey = isSectionKey(requested) ? requested : 'geral';

  const [state, dispatch] = useReducer(editorReducer, initialEditorState);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const saving = useRef(false);
  const formArea = useRef<HTMLDivElement>(null);
  const errors = state.errors?.section === section ? state.errors.map : EMPTY_ERRORS;

  // Seção inválida no endereço: abre Geral, sem deixar a inválida no histórico.
  useEffect(() => {
    if (requested !== null && !isSectionKey(requested)) {
      setParams({ secao: 'geral' }, { replace: true });
    }
  }, [requested, setParams]);

  useEffect(() => {
    let active = true;
    void loadSections().then((result) => {
      if (!active) return;
      dispatch(result.ok ? { type: 'loaded', sections: result.sections } : { type: 'loadFailed' });
    });
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  // Depois de uma validação com erro, o foco vai para o primeiro campo errado, uma vez
  // por pedido (editar depois não move o foco).
  const handledFocus = useRef(0);
  useEffect(() => {
    if (focusRequest === handledFocus.current) return;
    handledFocus.current = focusRequest;
    focusFirstError(formArea.current, errors);
  }, [focusRequest, errors]);

  const dismissToast = useCallback((id: number) => dispatch({ type: 'dismissToast', id }), []);

  const dirty = sectionIsDirty(state, section);
  const value = currentValue(state, section);

  // O login precisa saber se a sessão acabou com alterações não salvas.
  useEffect(() => {
    setUnsavedChanges(dirty);
    return () => setUnsavedChanges(false);
  }, [dirty, setUnsavedChanges]);

  // Fechar ou recarregar a aba com alterações: o aviso do próprio navegador.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Com alterações, pergunta antes; sem, segue direto. */
  function guard(action: PendingAction) {
    if (dirty) setPending(action);
    else run(action);
  }

  function run(action: PendingAction) {
    setPending(null);
    switch (action.kind) {
      case 'section':
        dispatch({ type: 'discard' });
        setParams({ secao: action.to });
        break;
      case 'discard':
        dispatch({ type: 'discard' });
        break;
      case 'viewSite':
        leaveTo('/');
        break;
      case 'signOut':
        void signOut();
        break;
    }
  }

  async function save() {
    if (saving.current || !state.sections) return;
    const normalized = normalizeSection(TREES[section], value);
    const result = validateSection(sectionSchemas[section], normalized);
    if (!result.ok) {
      dispatch({ type: 'invalid', section, errors: result.errors });
      setFocusRequest((count) => count + 1);
      return;
    }

    saving.current = true;
    dispatch({ type: 'saveStarted' });
    const saved = await saveSection(
      section,
      result.data as never,
      state.sections[section].updatedAt,
    );
    saving.current = false;
    dispatch(
      saved.ok
        ? {
            type: 'saved',
            section,
            data: result.data,
            updatedAt: saved.updatedAt,
            message: EDITOR_NOTICES.saved,
          }
        : { type: 'saveFailed', kind: saved.kind },
    );
    // O banco recusou a sessão: volta ao login com o aviso de sessão expirada.
    if (!saved.ok && saved.kind === 'sessionExpired') void expireSession();
  }

  let status: string | null = null;
  if (state.sections) {
    const sections = state.sections;
    const latest = latestUpdate(SECTION_KEYS.map((key) => sections[key].updatedAt));
    if (dirty) status = 'Alterações não salvas';
    else if (state.justSaved) status = 'Última publicação: agora';
    else status = latest ? `Última publicação: ${formatPublished(latest)}` : 'Ainda não publicado';
  }

  return (
    <>
      <EditorHeader
        status={status}
        unsaved={dirty}
        onViewSite={(event) => {
          if (!dirty) return;
          event.preventDefault();
          setPending({ kind: 'viewSite' });
        }}
        onSignOut={() => guard({ kind: 'signOut' })}
      />
      <main className={styles.main}>
        {state.load === 'loading' ? (
          <p className={styles.notice} role="status">
            Carregando o conteúdo…
          </p>
        ) : null}

        {state.load === 'failed' ? (
          <div className={styles.notice}>
            <p role="alert">{EDITOR_NOTICES.loadFailed}</p>
            <button
              type="button"
              className={buttonStyles.button}
              onClick={() => {
                dispatch({ type: 'loadStarted' });
                setLoadAttempt((count) => count + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : null}

        {state.load === 'ready' ? (
          <>
            <SectionPicker
              value={section}
              onChange={(next) => guard({ kind: 'section', to: next })}
            />
            <div ref={formArea} className={styles.formArea}>
              {errors.size > 0 ? (
                <div className={styles.summary} role="alert">
                  <p>{fieldsNeedingFix(errors.size)}</p>
                  <button
                    type="button"
                    className={styles.summaryLink}
                    onClick={() => focusFirstError(formArea.current, errors)}
                  >
                    Ir para o primeiro
                  </button>
                </div>
              ) : null}
              <SectionForm
                key={section}
                tree={TREES[section]}
                value={value}
                errors={errors}
                provisional={placeholderPaths(section, normalizeSection(TREES[section], value))}
                onChange={(path, next) => dispatch({ type: 'edit', section, path, value: next })}
              />
            </div>
          </>
        ) : null}
      </main>
      {state.load === 'ready' ? (
        <ActionBar
          dirty={dirty}
          saving={state.saving}
          onDiscard={() => guard({ kind: 'discard' })}
          onSave={() => void save()}
        />
      ) : null}
      <Toast toast={state.toast} onDismiss={dismissToast} />
      {pending ? (
        <ConfirmDialog
          title="Descartar alterações?"
          message="As alterações desta seção ainda não foram salvas."
          confirmLabel="Descartar"
          cancelLabel="Continuar editando"
          onConfirm={() => run(pending)}
          onCancel={() => setPending(null)}
        />
      ) : null}
    </>
  );
}
