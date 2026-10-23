import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { LabelsSettings } from '../components/LabelsSettings'
import { ProjectGeneralSettings } from '../components/ProjectGeneralSettings'
import { ProjectMembersSettings } from '../components/ProjectMembersSettings'
import { StatesSettings } from '../components/StatesSettings'
import { useCurrentProject } from '../hooks'

const TABS = ['general', 'states', 'labels', 'members']

export function ProjectSettingsPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'general'

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: workspace.name, to: `/${workspace.slug}` },
          { label: project.name, to: `/${workspace.slug}/projects/${project.id}/issues` },
          { label: 'Ajustes' },
        ]}
      />
      <PageBody>
        <div className="mx-auto max-w-4xl p-4 sm:p-8">
          <h1 className="mb-6 text-2xl font-semibold tracking-tight">Ajustes del proyecto</h1>
          <Tabs value={tab} onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}>
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="states">Estados</TabsTrigger>
              <TabsTrigger value="labels">Etiquetas</TabsTrigger>
              <TabsTrigger value="members">Miembros</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="mt-6">
              <ProjectGeneralSettings workspace={workspace} project={project} />
            </TabsContent>
            <TabsContent value="states" className="mt-6">
              <StatesSettings slug={workspace.slug} project={project} />
            </TabsContent>
            <TabsContent value="labels" className="mt-6">
              <LabelsSettings slug={workspace.slug} project={project} />
            </TabsContent>
            <TabsContent value="members" className="mt-6">
              <ProjectMembersSettings slug={workspace.slug} project={project} />
            </TabsContent>
          </Tabs>
        </div>
      </PageBody>
    </>
  )
}
