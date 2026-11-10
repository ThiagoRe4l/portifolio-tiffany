import type { AuthErrorKind } from './authApi';

const ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  invalidCredentials: 'E-mail ou senha incorretos.',
  network: 'Sem conexão com a internet. Verifique sua rede e tente novamente.',
  rateLimited: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  unavailable: 'Serviço indisponível no momento. Tente novamente em instantes.',
  samePassword: 'A nova senha precisa ser diferente da atual.',
  weakPassword: 'Esta senha não é segura o suficiente. Escolha outra.',
  expiredLink: 'Este link expirou ou já foi usado. Peça um novo para criar sua senha.',
  unknown: 'Não foi possível concluir agora. Tente novamente.',
};

export const messageFor = (kind: AuthErrorKind): string => ERROR_MESSAGES[kind];

export const AUTH_NOTICES = {
  recoverySent:
    'Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha.',
  sessionExpired: 'Sua sessão expirou. Entre novamente.',
  accessDenied: 'Esta conta não tem acesso à área administrativa.',
  checkFailed: 'Não foi possível confirmar seu acesso. Verifique sua conexão e tente novamente.',
  unconfigured: 'Área administrativa indisponível no momento.',
};
