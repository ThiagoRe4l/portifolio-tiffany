import type { UploadErrorKind } from './photoApi';

export type PhotoErrorKind = 'type' | 'tooLarge' | 'unreadable' | UploadErrorKind;

const KEPT = 'A foto anterior continua';

const MESSAGES: Record<PhotoErrorKind, string> = {
  type: 'Use uma foto em JPG, PNG ou WebP.',
  tooLarge: 'Esta foto é grande demais (máximo de 20 MB).',
  unreadable: 'Não foi possível preparar esta foto. Tente outra ou uma versão menor.',
  network: `Sem conexão com a internet. ${KEPT}; tente de novo.`,
  sessionExpired: 'Sua sessão expirou. Entre novamente.',
  forbidden: 'Esta conta não pode enviar fotos.',
  rejected: 'A foto preparada não foi aceita pelo envio. Tente outra foto.',
  unavailable: `Serviço indisponível no momento. ${KEPT}; tente de novo em instantes.`,
  unknown: `Não foi possível enviar a foto agora. ${KEPT}; tente de novo.`,
};

export const photoErrorMessage = (kind: PhotoErrorKind): string => MESSAGES[kind];

export const PHOTO_NOTICES = {
  preparing: 'Preparando a foto…',
  uploading: 'Enviando foto…',
  reviewAlt: 'Confira se o texto alternativo descreve a foto nova.',
};
