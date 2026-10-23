import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/app/guards/RequireAuth'
import { PublicOnlyRoute } from '@/app/guards/PublicOnlyRoute'
import { SessionGate } from '@/app/SessionGate'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { PageHeader } from '@/layouts/PageHeader'
import { NotFoundPage } from '@/pages/NotFoundPage'

function HomePage() {
  return (
    <>
      <PageHeader breadcrumbs={[{ label: 'Inicio' }]} />
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Aquí irán tus workspaces
      </div>
    </>
  )
}

export const router = createBrowserRouter([
  {
    element: <SessionGate />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            element: <PublicOnlyRoute />,
            children: [
              { path: '/login', element: <LoginPage /> },
              { path: '/register', element: <RegisterPage /> },
              { path: '/forgot-password', element: <ForgotPasswordPage /> },
            ],
          },
          { path: '/verify-email', element: <VerifyEmailPage /> },
          { path: '/reset-password', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: <HomePage /> },
              { path: '/profile', element: <ProfilePage /> },
            ],
          },
        ],
      },
      { path: '/index.html', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
