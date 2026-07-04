import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/shared/components/AppLayout';
import { RouteErrorBoundary } from '@/shared/components/ErrorBoundary/RouteErrorBoundary';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';
import { LoginPage } from '@/features/auth/components/LoginPage';
import { BoardPage } from '@/features/board/components/BoardPage';
import { AnalyticsPage } from '@/features/analytics/components/AnalyticsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <BoardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
    ],
  },
]);
