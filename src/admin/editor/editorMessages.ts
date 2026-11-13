import type { SaveErrorKind } from './contentApi';

const KEPT = 'Suas alterações continuam aqui';

const SAVE_ERRORS: Record<SaveErrorKind, string> = {
  conflict: 'Esta seção foi alterada em outro lugar. Recarregue para ver a versão mais recente.',
  network: `Sem conexão com a internet. ${KEPT}; tente salvar de novo.`,
  sessionExpired: 'Sua sessão expirou. Entre novamente.',
  forbidden: 'Esta conta não pode alterar o site.',
  unavailable: `Serviço indisponível no momento. ${KEPT}; tente de novo em instantes.`,
  unknown: `Não foi possível salvar agora. ${KEPT}; tente de novo.`,
};

export const saveErrorMessage = (kind: SaveErrorKind): string => SAVE_ERRORS[kind];

export const EDITOR_NOTICES = {
  saved: 'Publicado. O site atualiza em alguns minutos.',
  loadFailed: 'Não foi possível carregar o conteúdo.',
};
