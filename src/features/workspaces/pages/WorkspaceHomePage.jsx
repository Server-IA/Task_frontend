import { FolderKanban } from 'lucide-react'
import { EmptyState } from '@/components/common/States'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { useCurrentWorkspace } from '../hooks'

/** Inicio del workspace. En la fase de proyectos muestra la lista de proyectos. */
export function WorkspaceHomePage() {
  const workspace = useCurrentWorkspace()
  return (
    <>
      <PageHeader breadcrumbs={[{ label: workspace.name }]} />
      <PageBody>
        <EmptyState icon={FolderKanban} title="Proyectos" description="Aquí aparecerán los proyectos del workspace." />
      </PageBody>
    </>
  )
}
