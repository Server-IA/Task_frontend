import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Outlet, useParams } from 'react-router'
import { queryKeys } from '@/api/queryKeys'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { t } from '@/i18n'
import { PageHeader } from '@/layouts/PageHeader'
import { toApiError } from '@/lib/errors'
import { usePreferencesStore } from '@/stores/preferencesStore'
import { useWorkspace } from '../hooks'

/** Carga el workspace de la URL antes de mostrar sus páginas y lo recuerda como el último usado. */
export function WorkspaceLayout() {
  const { slug } = useParams()
  const { data: workspace, isLoading, error, refetch } = useWorkspace(slug)
  const setLastWorkspace = usePreferencesStore((state) => state.setLastWorkspace)
  const lastWorkspaceSlug = usePreferencesStore((state) => state.lastWorkspaceSlug)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (workspace) setLastWorkspace(workspace)
  }, [workspace, setLastWorkspace])

  useEffect(() => {
    // Si el último workspace ya no es accesible por este slug, no se vuelve a abrir automáticamente
    // (un fallo de red o del servidor no cuenta: el workspace sigue siendo suyo). Se conserva su id: si solo le
    // cambiaron la URL, el listado recargado lo encuentra con la nueva
    const status = error ? toApiError(error).status : 0
    if ((status === 403 || status === 404) && lastWorkspaceSlug === slug) {
      usePreferencesStore.setState({ lastWorkspaceSlug: null })
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces })
    }
  }, [error, slug, lastWorkspaceSlug, queryClient])

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error) {
    return (
      <>
        <PageHeader path={[{ label: slug }]} title={t('Workspace')} />
        <ErrorState error={error} onRetry={refetch} className="flex-1" />
      </>
    )
  }
  return <Outlet />
}
