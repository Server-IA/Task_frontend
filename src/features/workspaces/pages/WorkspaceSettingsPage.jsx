import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { workspacePath } from '@/lib/paths'
import { isAdminRole } from '@/lib/permissions'
import { GeneralSettings } from '../components/GeneralSettings'
import { InvitationsSettings } from '../components/InvitationsSettings'
import { MembersSettings } from '../components/MembersSettings'
import { useCurrentWorkspace, useMembers } from '../hooks'

const TABS = ['general', 'members', 'invitations']

export function WorkspaceSettingsPage() {
  const workspace = useCurrentWorkspace()
  const { data: members } = useMembers(workspace.slug)
  const [searchParams, setSearchParams] = useSearchParams()
  const isAdmin = isAdminRole(workspace.myRole)
  const requested = searchParams.get('tab')
  const tab = TABS.includes(requested) && (requested !== 'invitations' || isAdmin) ? requested : 'general'

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
      className="min-h-0 flex-1 gap-3.5"
    >
      <PageHeader
        path={[...workspacePath(workspace), { label: 'ajustes' }]}
        title="Ajustes del workspace"
        documentTitle={['Ajustes', workspace.name]}
      >
        <TabsList aria-label="Secciones">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">
            Miembros {members && <span className="font-mono">{members.length}</span>}
          </TabsTrigger>
          {isAdmin && <TabsTrigger value="invitations">Invitaciones</TabsTrigger>}
        </TabsList>
      </PageHeader>
      <PageBody>
        <div className="mx-auto max-w-[920px]">
          <TabsContent value="general">
            <GeneralSettings workspace={workspace} />
          </TabsContent>
          <TabsContent value="members">
            <MembersSettings workspace={workspace} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="invitations">
              <InvitationsSettings workspace={workspace} />
            </TabsContent>
          )}
        </div>
      </PageBody>
    </Tabs>
  )
}
