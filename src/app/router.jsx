import { createBrowserRouter, Navigate } from 'react-router'
import { RequireAuth } from '@/app/guards/RequireAuth'
import { PublicOnlyRoute } from '@/app/guards/PublicOnlyRoute'
import { SessionGate } from '@/app/SessionGate'
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'
import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage'
import { IssuePage } from '@/features/issues/pages/IssuePage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { IssuesPage } from '@/features/issues/pages/IssuesPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProjectLayout } from '@/features/projects/pages/ProjectLayout'
import { ProjectSettingsPage } from '@/features/projects/pages/ProjectSettingsPage'
import { HomeRedirect } from '@/features/workspaces/pages/HomeRedirect'
import { InvitationPage } from '@/features/workspaces/pages/InvitationPage'
import { OnboardingPage } from '@/features/workspaces/pages/OnboardingPage'
import { WorkspaceHomePage } from '@/features/workspaces/pages/WorkspaceHomePage'
import { WorkspaceLayout } from '@/features/workspaces/pages/WorkspaceLayout'
import { WorkspaceSettingsPage } from '@/features/workspaces/pages/WorkspaceSettingsPage'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
          { path: '/invitations/:token', element: <InvitationPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <HomeRedirect /> },
          { path: '/onboarding', element: <OnboardingPage /> },
          {
            element: <AppLayout />,
            children: [
              { path: '/profile', element: <ProfilePage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              {
                path: '/:slug',
                element: <WorkspaceLayout />,
                children: [
                  { index: true, element: <WorkspaceHomePage /> },
                  { path: 'settings', element: <WorkspaceSettingsPage /> },
                  {
                    path: 'projects/:projectId',
                    element: <ProjectLayout />,
                    children: [
                      { index: true, element: <Navigate to="issues" replace /> },
                      { path: 'issues', element: <IssuesPage /> },
                      { path: 'issues/:issueId', element: <IssuePage /> },
                      { path: 'settings', element: <ProjectSettingsPage /> },
                      { path: '*', element: <NotFoundPage /> },
                    ],
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '/index.html', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
