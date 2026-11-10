import { Navigate, type RouteObject } from 'react-router';
import { AdminEditorPage } from './AdminEditorPage';
import { AdminLoginPage } from './AdminLoginPage';
import { GuestOnly, RequireAdmin, RequireConfig } from './auth/RequireAdmin';
import { NewPasswordPage } from './NewPasswordPage';
import { RecoverPasswordPage } from './RecoverPasswordPage';

/**
 * Rotas do admin. Todo este módulo já está no chunk do admin, então as páginas
 * não precisam de carregamento sob demanda adicional.
 * Links para o site público devem recarregar a página (`<a href="/">`),
 * porque o site não faz parte deste roteador.
 */
export const adminRoutes: RouteObject[] = [
  {
    Component: RequireConfig,
    children: [
      {
        path: '/admin/login',
        element: (
          <GuestOnly>
            <AdminLoginPage />
          </GuestOnly>
        ),
      },
      { path: '/admin/recuperar-senha', Component: RecoverPasswordPage },
      // Aberta mesmo com sessão: é o próprio link do e-mail que cria a sessão.
      { path: '/admin/nova-senha', Component: NewPasswordPage },
      {
        path: '/admin',
        element: (
          <RequireAdmin>
            <AdminEditorPage />
          </RequireAdmin>
        ),
      },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
];
