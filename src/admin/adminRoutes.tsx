import { Navigate, type RouteObject } from 'react-router';
import { AdminEditorPage } from './AdminEditorPage';
import { AdminLoginPage } from './AdminLoginPage';

/**
 * Rotas do admin. Todo este módulo já está no chunk do admin, então as páginas
 * não precisam de carregamento sob demanda adicional.
 * Links para o site público devem recarregar a página (`<a href="/">`),
 * porque o site não faz parte deste roteador.
 */
export const adminRoutes: RouteObject[] = [
  { path: '/admin/login', Component: AdminLoginPage },
  { path: '/admin', Component: AdminEditorPage },
  { path: '*', element: <Navigate to="/admin" replace /> },
];
