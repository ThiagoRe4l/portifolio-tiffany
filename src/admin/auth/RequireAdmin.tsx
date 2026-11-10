import { Fragment, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router';
import { AuthCheckFailed, AuthLoading, AuthUnconfigured } from './AuthScreens';
import { useAuth } from './AuthProvider';

/** Sem as variáveis do Supabase, nenhuma tela do admin funciona (RF-16). */
export function RequireConfig() {
  const { status } = useAuth();
  return status === 'unconfigured' ? <AuthUnconfigured /> : <Outlet />;
}

/** Só decide o que mostrar; a proteção real dos dados é o RLS. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, retryCheck } = useAuth();

  if (status === 'admin') return children;
  if (status === 'loading' || status === 'checking') return <AuthLoading />;
  if (status === 'checkFailed') return <AuthCheckFailed onRetry={retryCheck} />;
  return <Navigate to="/admin/login" replace />;
}

/** Telas de quem ainda não entrou: quem já está conectado vai para `/admin`. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status, deniedAttempts, retryCheck } = useAuth();

  if (status === 'admin') return <Navigate to="/admin" replace />;
  if (status === 'loading' || status === 'checking') return <AuthLoading />;
  if (status === 'checkFailed') return <AuthCheckFailed onRetry={retryCheck} />;
  // A chave não depende do tempo da rede: a tela nem sempre chega a sair de cena.
  return <Fragment key={deniedAttempts}>{children}</Fragment>;
}
