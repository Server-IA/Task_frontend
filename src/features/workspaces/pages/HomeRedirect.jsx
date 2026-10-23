import { Navigate } from 'react-router'
import { FullScreenLoader } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useWorkspaces } from '../hooks'

/** «/»: abre el último workspace usado, el primero disponible o el onboarding. */
export function HomeRedirect() {
  const { data: workspaces, isLoading, error, refetch } = useWorkspaces()
  const lastSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)

  if (isLoading) return <FullScreenLoader />
  if (error) return <ErrorState error={error} onRetry={refetch} className="h-full" />
  if (!workspaces?.length) return <Navigate to="/onboarding" replace />

  const target = workspaces.find((workspace) => workspace.slug === lastSlug) ?? workspaces[0]
  return <Navigate to={`/${target.slug}`} replace />
}
