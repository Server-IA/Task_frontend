import { useSearchParams } from 'react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageBody, PageHeader } from '@/layouts/PageHeader'
import { workspacePath } from '@/lib/paths'
import { can } from '@/lib/permissions'
import { GeneralSettings } from '../components/GeneralSettings'
import { InvitationsSettings } from '../components/InvitationsSettings'
import { MembersSettings } from '../components/MembersSettings'
import { RolesSettings } from '../components/RolesSettings'
import { StorageSettings } from '../components/StorageSettings'
import { useCurrentWorkspace, useMembers } from '../hooks'

const TABS = ['general', 'members', 'roles', 'invitations', 'storage']
/** Pestañas que piden un permiso (sin él, la URL lleva a «General»). Los roles los ve cualquiera. */
const TAB_PERMISSIONS = { invitations: 'MEMBER_INVITE', storage: 'STORAGE_VIEW' }

export function WorkspaceSettingsPage() {
  const workspace = useCurrentWorkspace()
  const { data: members } = useMembers(workspace.slug)
  const [searchParams, setSearchParams] = useSearchParams()
  const canInvite = can(workspace, 'MEMBER_INVITE')
  const canSeeStorage = can(workspace, 'STORAGE_VIEW')
  const requested = searchParams.get('tab')
  const allowed = TABS.includes(requested) && (!TAB_PERMISSIONS[requested] || can(workspace, TAB_PERMISSIONS[requested]))
  const tab = allowed ? requested : 'general'

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
          <TabsTrigger value="roles">Roles</TabsTrigger>
          {canInvite && <TabsTrigger value="invitations">Invitaciones</TabsTrigger>}
          {canSeeStorage && <TabsTrigger value="storage">Almacenamiento</TabsTrigger>}
        </TabsList>
      </PageHeader>
      <PageBody>
        <div className="mx-auto max-w-[1320px]">
          <TabsContent value="general">
            <GeneralSettings workspace={workspace} />
          </TabsContent>
          <TabsContent value="members">
            <MembersSettings workspace={workspace} />
          </TabsContent>
          <TabsContent value="roles">
            <RolesSettings workspace={workspace} />
          </TabsContent>
          {canInvite && (
            <TabsContent value="invitations">
              <InvitationsSettings workspace={workspace} />
            </TabsContent>
          )}
          {canSeeStorage && (
            <TabsContent value="storage">
              <StorageSettings workspace={workspace} />
            </TabsContent>
          )}
        </div>
      </PageBody>
    </Tabs>
  )
}
