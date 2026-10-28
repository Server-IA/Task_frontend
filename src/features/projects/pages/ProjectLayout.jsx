import { useCallback } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { CenteredSpinner } from '@/components/common/Loaders'
import { ErrorState } from '@/components/common/States'
import { useHotkey } from '@/hooks/useHotkey'
import { PageHeader } from '@/layouts/PageHeader'
import { useProject } from '../hooks'

/**
 * Carga el proyecto de la URL antes de mostrar sus páginas (tareas, ciclos, módulos, hoja de ruta,
 * estadísticas, ajustes).
 */
export function ProjectLayout() {
  const { slug, projectId } = useParams()
  const { data: project, isLoading, error, refetch } = useProject(slug, projectId)
  const navigate = useNavigate()

  // Atajos de la sidebar: I tareas, Y ciclos, M módulos, R hoja de ruta, S estadísticas, «,» ajustes
  const base = `/${slug}/projects/${projectId}`
  useHotkey('i', useCallback(() => navigate(`${base}/issues`), [navigate, base]))
  useHotkey('y', useCallback(() => navigate(`${base}/cycles`), [navigate, base]))
  useHotkey('m', useCallback(() => navigate(`${base}/modules`), [navigate, base]))
  useHotkey('r', useCallback(() => navigate(`${base}/roadmap`), [navigate, base]))
  useHotkey('s', useCallback(() => navigate(`${base}/stats`), [navigate, base]))
  useHotkey(',', useCallback(() => navigate(`${base}/settings`), [navigate, base]))

  if (isLoading) return <CenteredSpinner className="flex-1" />
  if (error || !project) {
    return (
      <>
        <PageHeader path={[{ label: slug, to: `/${slug}` }]} title="Proyecto" />
        <ErrorState error={error} onRetry={refetch} homeLink={`/${slug}`} className="flex-1" />
      </>
    )
  }
  return <Outlet />
}
