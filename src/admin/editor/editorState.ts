import { SECTION_KEYS, sectionSchemas } from '@/content/schema';
import type { SectionKey } from '@/content/types';
import type { SaveErrorKind, Sections } from './contentApi';
import { isDirty, setAt, type Path } from './draft';
import { saveErrorMessage } from './editorMessages';
import { normalizeSection, toDisplay } from './normalize';
import { buildTree, type FieldNode } from './schemaTree';
import { pathKey } from './validation';

/** Árvore de cada seção, montada uma vez. */
export const TREES = Object.fromEntries(
  SECTION_KEYS.map((key) => [key, buildTree(sectionSchemas[key])]),
) as Record<SectionKey, FieldNode>;

export type Toast = { id: number; tone: 'success' | 'error'; message: string };

export type EditorState = {
  load: 'loading' | 'failed' | 'ready';
  sections: Sections | null;
  /** Rascunho da seção aberta; `null` = igual ao salvo. */
  draft: { section: SectionKey; value: unknown } | null;
  errors: { section: SectionKey; map: Map<string, string> } | null;
  saving: boolean;
  justSaved: boolean;
  toast: Toast | null;
};

export type EditorAction =
  | { type: 'loadStarted' }
  | { type: 'loaded'; sections: Sections }
  | { type: 'loadFailed' }
  | { type: 'edit'; section: SectionKey; path: Path; value: unknown }
  | { type: 'discard' }
  | { type: 'invalid'; section: SectionKey; errors: Map<string, string> }
  | { type: 'saveStarted' }
  | { type: 'saved'; section: SectionKey; data: unknown; updatedAt: string; message: string }
  | { type: 'saveFailed'; kind: SaveErrorKind }
  | { type: 'dismissToast'; id: number };

export const initialEditorState: EditorState = {
  load: 'loading',
  sections: null,
  draft: null,
  errors: null,
  saving: false,
  justSaved: false,
  toast: null,
};

let toastId = 0;

/** Valor exibido da seção: o rascunho, se houver; senão, o salvo, com telefones formatados. */
export function currentValue(state: EditorState, section: SectionKey): unknown {
  if (state.draft?.section === section) return state.draft.value;
  const saved = state.sections?.[section].data;
  return saved === undefined ? undefined : toDisplay(TREES[section], saved);
}

export function sectionIsDirty(state: EditorState, section: SectionKey): boolean {
  if (state.draft?.section !== section || !state.sections) return false;
  return isDirty(state.sections[section].data, normalizeSection(TREES[section], state.draft.value));
}

/** Tira os erros do campo editado e de tudo dentro dele (itens de lista mudam de posição). */
function withoutErrorsAt(map: Map<string, string>, path: Path): Map<string, string> {
  const key = pathKey(path);
  return new Map(
    [...map].filter(([errorKey]) => errorKey !== key && !errorKey.startsWith(`${key}.`)),
  );
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'loadStarted':
      return { ...state, load: 'loading' };
    case 'loaded':
      return { ...initialEditorState, load: 'ready', sections: action.sections };
    case 'loadFailed':
      return { ...state, load: 'failed' };
    case 'edit': {
      const base = currentValue(state, action.section);
      const errors =
        state.errors?.section === action.section
          ? { section: action.section, map: withoutErrorsAt(state.errors.map, action.path) }
          : null;
      return {
        ...state,
        draft: { section: action.section, value: setAt(base, action.path, action.value) },
        errors,
      };
    }
    case 'discard':
      return { ...state, draft: null, errors: null };
    case 'invalid':
      return { ...state, errors: { section: action.section, map: action.errors } };
    case 'saveStarted':
      return { ...state, saving: true, errors: null };
    case 'saved': {
      if (!state.sections) return state;
      const sections = {
        ...state.sections,
        [action.section]: { data: action.data, updatedAt: action.updatedAt },
      } as Sections;
      return {
        ...state,
        sections,
        draft: null,
        saving: false,
        justSaved: true,
        toast: { id: ++toastId, tone: 'success', message: action.message },
      };
    }
    case 'saveFailed':
      return {
        ...state,
        saving: false,
        toast: { id: ++toastId, tone: 'error', message: saveErrorMessage(action.kind) },
      };
    case 'dismissToast':
      return state.toast?.id === action.id ? { ...state, toast: null } : state;
  }
}
