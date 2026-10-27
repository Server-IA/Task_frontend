import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { projectPath } from '@/lib/paths'
import { LabelsSettings } from '../components/LabelsSettings'
import { ProjectGeneralSettings } from '../components/ProjectGeneralSettings'
import { ProjectMembersSettings } from '../components/ProjectMembersSettings'
import { StatesSettings } from '../components/StatesSettings'
import { useCurrentProject, useLabels, useProjectMembers, useStates } from '../hooks'

const TABS = ['general', 'states', 'labels', 'members']

export function ProjectSettingsPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { data: states } = useStates(workspace.slug, project.id)
  const { data: labels } = useLabels(workspace.slug, project.id)
  const { data: members } = useProjectMembers(workspace.slug, project.id)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'general'

  const count = (list) => list && <span className="font-mono">{list.length}</span>

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
      className="min-h-0 flex-1 gap-3.5"
    >
      <PageHeader
        path={[...projectPath(workspace, project), { label: 'ajustes' }]}
        title="Ajustes del proyecto"
        documentTitle={['Ajustes', project.name]}
      >
        <TabsList aria-label="Secciones">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="states">Estados {count(states)}</TabsTrigger>
          <TabsTrigger value="labels">Etiquetas {count(labels)}</TabsTrigger>
          <TabsTrigger value="members">Miembros {count(members)}</TabsTrigger>
        </TabsList>
      </PageHeader>
      <PageBody>
        <div className="mx-auto max-w-[920px]">
          <TabsContent value="general">
            <ProjectGeneralSettings workspace={workspace} project={project} />
          </TabsContent>
          <TabsContent value="states">
            <StatesSettings slug={workspace.slug} project={project} />
          </TabsContent>
          <TabsContent value="labels">
            <LabelsSettings slug={workspace.slug} project={project} />
          </TabsContent>
          <TabsContent value="members">
            <ProjectMembersSettings slug={workspace.slug} project={project} />
          </TabsContent>
        </div>
      </PageBody>
    </Tabs>
  )
}
