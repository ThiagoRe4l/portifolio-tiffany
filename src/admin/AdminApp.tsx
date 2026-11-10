import { createBrowserRouter, RouterProvider } from 'react-router';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';
import { consumeRecoveryHash } from './auth/recoveryHash';

consumeRecoveryHash();
const router = createBrowserRouter(adminRoutes);

export function AdminApp() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
