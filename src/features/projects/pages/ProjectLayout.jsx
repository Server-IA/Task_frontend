import { Outlet, useParams } from 'react-router'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { CanEditIssuesContext } from '@/features/issues/editPermission'
import { useWorkspace } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { PageHeader } from '@/layouts/PageHeader'
import { can } from '@/lib/permissions'
import { useProject } from '../hooks'

/**
 * Carga el proyecto de la URL antes de mostrar sus páginas (tareas, ciclos, daily, módulos, hoja de ruta,
 * estadísticas, reportes, ajustes).
 */
export function ProjectLayout() {
  const { slug, projectId } = useParams()
  const { data: project, isLoading, error, refetch } = useProject(slug, projectId)
  // Sin el permiso de editar tareas, las tarjetas y las filas apagan sus selectores y el arrastre
  const { data: workspace } = useWorkspace(slug)

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error || !project) {
    return (
      <>
        <PageHeader path={[{ label: slug, to: `/${slug}` }]} title={t('Proyecto')} />
        <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}`} className="flex-1" />
      </>
    )
  }
  return (
    <CanEditIssuesContext.Provider value={can(workspace, 'ISSUE_EDIT')}>
      <Outlet />
    </CanEditIssuesContext.Provider>
  )
}
