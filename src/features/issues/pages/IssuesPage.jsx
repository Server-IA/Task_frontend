import { CircleDot } from 'lucide-react'
import { EmptyState } from '@/components/common/States'
import { useCurrentProject } from '@/features/projects/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'

export function IssuesPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: workspace.name, to: `/${workspace.slug}` },
          { label: project.name },
          { label: 'Issues' },
        ]}
      />
      <PageBody>
        <EmptyState icon={CircleDot} title="Issues" description="Aquí irán la lista y el Kanban." />
      </PageBody>
    </>
  )
}
