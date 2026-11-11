import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectGithubSettings } from '@/features/github/ProjectGithubSettings'
import { TemplatesSettings } from '@/features/templates/components/TemplatesSettings'
import { useTemplates } from '@/features/templates/hooks'
import { useCurrentWorkspace } from '@/features/workspaces/hooks'
import { t } from '@/i18n'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { projectPath } from '@/lib/paths'
import { LabelsSettings } from '../components/LabelsSettings'
import { ProjectGeneralSettings } from '../components/ProjectGeneralSettings'
import { ProjectMembersSettings } from '../components/ProjectMembersSettings'
import { StatesSettings } from '../components/StatesSettings'
import { useCurrentProject, useLabels, useProjectMembers, useStates } from '../hooks'

const TABS = ['general', 'states', 'labels', 'members', 'templates', 'github']

export function ProjectSettingsPage() {
  const workspace = useCurrentWorkspace()
  const project = useCurrentProject()
  const { data: states } = useStates(workspace.slug, project.id)
  const { data: labels } = useLabels(workspace.slug, project.id)
  const { data: members } = useProjectMembers(workspace.slug, project.id)
  const { data: templates } = useTemplates(workspace.slug, project.id)
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
        path={[...projectPath(workspace, project), { label: t('ajustes') }]}
        title={t('Ajustes del proyecto')}
        documentTitle={[t('Ajustes'), project.name]}
      >
        <TabsList aria-label={t('Secciones')}>
          <TabsTrigger value="general">{t('General')}</TabsTrigger>
          <TabsTrigger value="states">{t('Estados')} {count(states)}</TabsTrigger>
          <TabsTrigger value="labels">{t('Etiquetas')} {count(labels)}</TabsTrigger>
          <TabsTrigger value="members">{t('Miembros')} {count(members)}</TabsTrigger>
          <TabsTrigger value="templates">{t('Plantillas')} {count(templates)}</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
        </TabsList>
      </PageHeader>
      <PageBody>
        <div className="mx-auto max-w-[1320px]">
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
          <TabsContent value="templates">
            <TemplatesSettings slug={workspace.slug} project={project} />
          </TabsContent>
          <TabsContent value="github">
            <ProjectGithubSettings workspace={workspace} project={project} />
          </TabsContent>
        </div>
      </PageBody>
    </Tabs>
  )
}
