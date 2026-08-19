import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { InventarioPage } from './pages/InventarioPage';
import { MovimientosPage } from './pages/MovimientosPage';
import { AlertasPage } from './pages/AlertasPage';
import { AboutPage } from './pages/AboutPage';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'inventario',
        element: <InventarioPage />,
      },
      {
        path: 'movimientos',
        element: <MovimientosPage />,
      },
      {
        path: 'alertas',
        element: <AlertasPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      // legacy redirect
      {
        path: 'home',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
