import { createBrowserRouter, RouterProvider } from 'react-router';
import { adminRoutes } from './adminRoutes';

const router = createBrowserRouter(adminRoutes);

export function AdminApp() {
  return <RouterProvider router={router} />;
}
