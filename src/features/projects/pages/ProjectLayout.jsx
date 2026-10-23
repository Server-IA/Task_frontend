import { Outlet, useParams } from 'react-router'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { PageHeader } from '@/layouts/PageHeader'
import { useProject } from '../hooks'

/** Carga el proyecto de la URL antes de mostrar sus páginas (issues, ciclos, módulos, ajustes). */
export function ProjectLayout() {
  const { slug, projectId } = useParams()
  const { data: project, isLoading, error, refetch } = useProject(slug, projectId)

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error || !project) {
    return (
      <>
        <PageHeader breadcrumbs={[{ label: 'Proyecto' }]} />
        <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}`} className="flex-1" />
      </>
    )
  }
  return <Outlet />
}
