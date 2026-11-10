import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isAdmin, isAuthConfigured, onSessionChange, signOut as endSession } from './authApi';

export type AuthStatus =
  'loading' | 'signedOut' | 'checking' | 'admin' | 'denied' | 'checkFailed' | 'unconfigured';

export type AuthNotice = 'sessionExpired' | 'accessDenied';

type AuthContextValue = {
  status: AuthStatus;
  notice: AuthNotice | null;
  /** Sobe a cada acesso negado, para o login recomeçar do zero. */
  deniedAttempts: number;
  retryCheck: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Estado único da sessão. Só organiza as telas: quem protege os dados é o RLS. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    isAuthConfigured() ? 'loading' : 'unconfigured',
  );
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [deniedAttempts, setDeniedAttempts] = useState(0);

  const currentUser = useRef<string | null>(null);
  const expectingSignOut = useRef(false);
  // Cada verificação recebe um número; só a mais recente pode mudar o estado.
  const latestCheck = useRef(0);

  const runCheck = useCallback(async (userId: string) => {
    const check = ++latestCheck.current;
    setStatus('checking');

    const result = await isAdmin(userId);
    if (check !== latestCheck.current) return;

    if (result === 'admin') {
      setNotice(null);
      setStatus('admin');
    } else if (result === 'failed') {
      setStatus('checkFailed');
    } else {
      expectingSignOut.current = true;
      setNotice('accessDenied');
      setDeniedAttempts((count) => count + 1);
      setStatus('denied');
      await endSession();
    }
  }, []);

  const configured = status !== 'unconfigured';

  useEffect(() => {
    if (!configured) return;

    const stop = onSessionChange((userId) => {
      const previous = currentUser.current;
      currentUser.current = userId;
      const expected = expectingSignOut.current;
      expectingSignOut.current = false;

      if (userId === null) {
        latestCheck.current += 1;
        if (previous !== null && !expected) setNotice('sessionExpired');
        setStatus('signedOut');
      } else if (userId !== previous) {
        // Renovação do token repete a mesma conta: não refaz a verificação.
        void runCheck(userId);
      }
    });

    return () => {
      stop();
      latestCheck.current += 1;
    };
  }, [configured, runCheck]);

  const retryCheck = useCallback(() => {
    if (currentUser.current) void runCheck(currentUser.current);
  }, [runCheck]);

  const signOut = useCallback(async () => {
    expectingSignOut.current = true;
    latestCheck.current += 1;
    setNotice(null);
    await endSession();
    currentUser.current = null;
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, notice, deniedAttempts, retryCheck, signOut }),
    [status, notice, deniedAttempts, retryCheck, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa estar dentro de um AuthProvider');
  return value;
}
