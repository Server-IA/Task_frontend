import { Link, useParams } from 'react-router'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/States'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { PageHeader } from '@/layouts/PageHeader'
import { can, myRoleName } from '@/lib/permissions'

/**
 * Muestra la página solo a quien tiene ese permiso en el workspace de la URL. A los demás (llegaron por un enlace o
 * escribiendo la dirección: el menú ya no les ofrece la sección) les explica que su rol no la incluye, en vez de
 * dejar que la página falle con los 403 del backend.
 * @param {{ permission: string, title: string, children: React.ReactNode }} props
 */
export function RequirePermission({ permission, title, children }) {
  const workspace = useCurrentWorkspace()
  const { slug, projectId } = useParams()
  if (can(workspace, permission)) return children

  const back = projectId ? `/${slug}/projects/${projectId}/issues` : `/${slug}`
  return (
    <>
      <PageHeader path={[{ label: slug, to: `/${slug}` }]} title={title} />
      <EmptyState
        icon={Lock}
        className="flex-1"
        title={t('Tu rol no incluye esta sección')}
        description={t('Tienes el rol «{role}». Si la necesitas, pídele a un project manager que te dé el permiso.', { role: myRoleName(workspace) })}
        action={
          <Button asChild variant="outline">
            <Link to={back}>{projectId ? t('Ir a las tareas') : t('Ir a los proyectos')}</Link>
          </Button>
        }
      />
    </>
  )
}
