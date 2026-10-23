import { useEffect } from 'react'
import { Outlet, useParams } from 'react-router'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { PageHeader } from '@/layouts/PageHeader'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useWorkspace } from '../hooks'

/** Carga el workspace de la URL antes de mostrar sus páginas y lo recuerda como el último usado. */
export function WorkspaceLayout() {
  const { slug } = useParams()
  const { data: workspace, isLoading, error, refetch } = useWorkspace(slug)
  const setLastWorkspaceSlug = usePreferencesStore((state) => state.setLastWorkspaceSlug)
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)

  useEffect(() => {
    if (workspace) setLastWorkspaceSlug(workspace.slug)
  }, [workspace, setLastWorkspaceSlug])

  useEffect(() => {
    // Si el último workspace ya no es accesible, no se vuelve a abrir automáticamente
    if (error && lastWorkspaceSlug === slug) setLastWorkspaceSlug(null)
  }, [error, slug, lastWorkspaceSlug, setLastWorkspaceSlug])

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: slug }]} />
        <ErrorState error={error} onRetry={refetch} className="flex-1" />
      </>
    )
  }
  return <Outlet />
}
