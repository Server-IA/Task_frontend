/**
 * Alias JSDoc de los tipos de la API para el autocompletado de VS Code.
 * Se generan desde el backend con `npm run api:types` (archivo schema.d.ts).
 * No afectan la ejecución: solo sirven al editor.
 *
 * Uso: `/** @param {import('@/api/types').IssueResponse} issue *\/`
 */

/** @typedef {import('./schema').components['schemas']} Schemas */

/** @typedef {Schemas['AuthResponse']} AuthResponse */
/** @typedef {Schemas['UserResponse']} UserResponse */
/** @typedef {Schemas['UserSummaryResponse']} UserSummary */
/** @typedef {Schemas['WorkspaceResponse']} WorkspaceResponse */
/** @typedef {Schemas['WorkspaceMemberResponse']} WorkspaceMember */
/** @typedef {Schemas['InvitationResponse']} InvitationResponse */
/** @typedef {Schemas['InvitationDetailsResponse']} InvitationDetails */
/** @typedef {Schemas['ProjectResponse']} ProjectResponse */
/** @typedef {Schemas['ProjectMemberResponse']} ProjectMember */
/** @typedef {Schemas['StateResponse']} StateResponse */
/** @typedef {Schemas['LabelResponse']} LabelResponse */
/** @typedef {Schemas['IssueResponse']} IssueResponse */
/** @typedef {Schemas['CommentResponse']} CommentResponse */
/** @typedef {Schemas['ActivityResponse']} ActivityResponse */
/** @typedef {Schemas['NotificationResponse']} NotificationResponse */
/** @typedef {Schemas['CycleResponse']} CycleResponse */
/** @typedef {Schemas['ModuleResponse']} ModuleResponse */
/** @typedef {Schemas['IssueSummaryResponse']} IssueSummary */
/** @typedef {Schemas['ProjectRefResponse']} ProjectRef */

/** @typedef {Schemas['IssueRelationsResponse']} IssueRelations */
/** @typedef {Schemas['IssueRelationResponse']} IssueRelation */
/** @typedef {Schemas['RelatedIssueResponse']} RelatedIssue */
/** @typedef {Schemas['CreateIssueRelationRequest']['type']} RelationType */

/** @typedef {Schemas['ChecklistItemResponse']} ChecklistItem */
/** @typedef {Schemas['ChecklistItemRequest']['kind']} ChecklistKind */
/** @typedef {Schemas['ChecklistItemRequest']} ChecklistItemRequest */

/** @typedef {Schemas['IssueTemplateResponse']} IssueTemplate */
/** @typedef {Schemas['TemplateChecklistItemResponse']} TemplateChecklistItem */
/** @typedef {Schemas['IssueTemplateRequest']} IssueTemplateRequest */

/** @typedef {Schemas['SavedViewResponse']} SavedView */
/** @typedef {Schemas['SavedViewFilters']} SavedViewFilters */

/** @typedef {Schemas['ProjectStatsResponse']} ProjectStats */
/** @typedef {Schemas['ThroughputWeek']} ThroughputWeek */
/** @typedef {Schemas['Burndown']} Burndown */
/** @typedef {Schemas['BurndownPoint']} BurndownPoint */
/** @typedef {Schemas['OpenStateCount']} OpenStateCount */
/** @typedef {Schemas['WorkloadEntry']} WorkloadEntry */
/** @typedef {Schemas['StaleIssue']} StaleIssue */

/** @typedef {Schemas['MyWorkResponse']} MyWorkResponse */

/** @typedef {Schemas['ActivityFeedItemResponse']} ActivityFeedItem */
/** @typedef {NonNullable<ActivityFeedItem['field']>} ActivityField */
/** @typedef {Schemas['ActivitySummaryResponse']} ActivitySummary */
/** @typedef {Schemas['ProjectActivity']} ProjectActivity */

/** @typedef {'OWNER' | 'MEMBER'} WorkspaceRole */

/**
 * @template T
 * @typedef {{ content: T[], page: number, size: number, totalElements: number, totalPages: number, first: boolean, last: boolean }} Page
 */

export {}
