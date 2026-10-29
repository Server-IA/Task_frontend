import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Check, Copy, UserRound } from 'lucide-react'
import { StateIcon } from '@/components/common/StateIcon'
import { cn } from '@/lib/utils'
import { useSessionStore } from '@/stores/sessionStore'
import { highlightCode } from '../highlight'
import { safeHref } from '../markdown/links'
import { markdownToDoc } from '../markdown/parse'
import { collectTaskCodes, splitTaskRefs } from '../markdown/taskRefs'
import { numberTaskItems, taskItemText } from '../markdown/taskItems'
import { parseUserStory } from '../markdown/userStory'
import { useTaskRefs } from '../taskRefs'

/**
 * Vista de lectura de un texto con formato (descripción, comentario). Dibuja el mismo documento que el editor
 * (`markdownToDoc`) con las mismas reglas de estilo (.tf-md), sin cargar el editor.
 *
 * - Las menciones son pastillas («@Ana», resaltada si soy yo) y los códigos de tarea que existen en el workspace,
 *   pastillas con su estado y título (nunca dentro de código).
 * - Los enlaces se abren en otra pestaña; solo http(s) y mailto.
 * - Con `onToggleTask(index, checked)` las casillas se pueden marcar; con `onMoveTasks([index])` cada casilla
 *   ofrece «Pasar al checklist».
 * - Una cita «**Como** … **quiero** … **para** …» se dibuja como la tarjeta de la historia de usuario.
 *
 * @param {{ markdown?: string | null, doc?: object, size?: 'md' | 'sm', slug?: string, projectId?: string,
 *           onOpenIssue?: (issueId: string) => void, onToggleTask?: (index: number, checked: boolean) => void,
 *           onMoveTasks?: (indexes: number[]) => void, className?: string }} props
 */
export function MarkdownView({
  markdown,
  doc: docProp,
  size = 'md',
  slug,
  projectId,
  onOpenIssue,
  onToggleTask,
  onMoveTasks,
  className,
  ...props
}) {
  const doc = useMemo(() => docProp ?? markdownToDoc(markdown), [docProp, markdown])
  const codes = useMemo(() => collectTaskCodes(doc), [doc])
  const refs = useTaskRefs(slug, codes)
  const me = useSessionStore((state) => state.user?.id)
  // Número de cada casilla en el orden del documento (el mismo que usan setTaskChecked y takeTaskItems)
  const taskNumbers = useMemo(() => numberTaskItems(doc), [doc])

  const ctx = { refs, slug, projectId, onOpenIssue, onToggleTask, onMoveTasks, me, size, taskNumbers }
  return (
    <div className={cn('tf-md', size === 'sm' && 'tf-md-sm', className)} {...props}>
      {renderBlocks(doc.content, ctx)}
    </div>
  )
}

function renderBlocks(nodes = [], ctx) {
  return nodes.map((node, index) => <Fragment key={index}>{renderBlock(node, ctx)}</Fragment>)
}

function renderBlock(node, ctx) {
  switch (node.type) {
    case 'paragraph':
      return node.content?.length ? <p>{renderInline(node.content, ctx)}</p> : null
    case 'heading': {
      const Tag = `h${Math.min(Math.max(node.attrs?.level ?? 1, 1), 3)}`
      return <Tag>{renderInline(node.content, ctx)}</Tag>
    }
    case 'bulletList':
      return <ul>{renderBlocks(node.content, ctx)}</ul>
    case 'orderedList':
      return <ol start={node.attrs?.start ?? 1}>{renderBlocks(node.content, ctx)}</ol>
    case 'listItem':
      return <li>{renderBlocks(node.content, ctx)}</li>
    case 'taskList':
      return <ul className="tf-md-tasks">{renderBlocks(node.content, ctx)}</ul>
    case 'taskItem':
      return <TaskItemView node={node} index={ctx.taskNumbers.get(node) ?? -1} ctx={ctx} />
    case 'blockquote': {
      const story = parseUserStory(node)
      if (story) return <UserStoryCard story={story} size={ctx.size} textLength={textLength(node)} />
      return <blockquote>{renderBlocks(node.content, ctx)}</blockquote>
    }
    case 'codeBlock':
      return <CodeBlockView language={node.attrs?.language} code={(node.content ?? []).map((child) => child.text).join('')} />
    case 'horizontalRule':
      return <hr />
    case 'table':
      return (
        <table>
          <tbody>{renderBlocks(node.content, ctx)}</tbody>
        </table>
      )
    case 'tableRow':
      return <tr>{renderBlocks(node.content, ctx)}</tr>
    case 'tableHeader':
      return <th scope="col">{renderBlocks(node.content, ctx)}</th>
    case 'tableCell':
      return <td>{renderBlocks(node.content, ctx)}</td>
    default:
      return node.content ? renderBlocks(node.content, ctx) : null
  }
}

function renderInline(nodes = [], ctx) {
  return nodes.map((node, index) => {
    if (node.type === 'hardBreak') return <br key={index} />
    if (node.type === 'mention') {
      const isMe = Boolean(ctx.me) && node.attrs?.id === ctx.me
      return (
        <span key={index} className="tf-mention" data-me={isMe || undefined} data-md-atom="">
          @{node.attrs?.label}
        </span>
      )
    }
    if (node.type !== 'text') return null
    const marks = node.marks ?? []
    const has = (type) => marks.some((mark) => mark.type === type)
    const link = marks.find((mark) => mark.type === 'link')

    let content = has('code') || link ? node.text : textWithRefs(node.text, ctx)
    if (has('code')) content = <code>{content}</code>
    if (has('strike')) content = <s>{content}</s>
    if (has('italic')) content = <em>{content}</em>
    if (has('bold')) content = <strong>{content}</strong>
    if (link) {
      const href = safeHref(link.attrs?.href)
      if (href) {
        content = (
          <a href={href} target="_blank" rel="noopener noreferrer" title={href}>
            {content}
          </a>
        )
      }
    }
    return <Fragment key={index}>{content}</Fragment>
  })
}

/** Texto con los códigos de tarea que existen como pastillas. */
function textWithRefs(text, ctx) {
  if (!ctx.refs.size) return text
  const segments = splitTaskRefs(text)
  if (!segments.some((segment) => segment.type === 'ref' && ctx.refs.has(segment.code))) return text
  return segments.map((segment, index) => {
    const issue = segment.type === 'ref' ? ctx.refs.get(segment.code) : null
    if (!issue) return <Fragment key={index}>{segment.type === 'ref' ? segment.code : segment.text}</Fragment>
    return <TaskRefChip key={index} issue={issue} ctx={ctx} />
  })
}

/** Pastilla de una tarea: estado, código y título. En el mismo proyecto se abre en el panel; si no, en su página. */
export function TaskRefChip({ issue, ctx }) {
  const url = `/${ctx.slug}/projects/${issue.projectId ?? issue.project?.id}/issues/${issue.id}`
  const samePanel = ctx.onOpenIssue && (issue.projectId ?? issue.project?.id) === ctx.projectId
  return (
    <Link
      to={url}
      className="tf-chip"
      data-md-text={issue.code}
      title={`${issue.code} · ${issue.title} · ${issue.state?.name ?? ''}`}
      onClick={(event) => {
        if (!samePanel || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
        event.preventDefault()
        ctx.onOpenIssue(issue.id)
      }}
    >
      <StateIcon group={issue.state?.group} color={issue.state?.color} className="size-3" />
      <span className="font-mono text-xs text-muted-foreground">{issue.code}</span>
      <span className="min-w-0 truncate">{issue.title}</span>
    </Link>
  )
}

function TaskItemView({ node, index, ctx }) {
  const checked = Boolean(node.attrs?.checked)
  const text = taskItemText(node)
  return (
    <li className="tf-md-task group/task" data-checked={checked}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={text || 'Casilla'}
        className="tf-md-check"
        data-md-ui=""
        disabled={!ctx.onToggleTask}
        onClick={() => ctx.onToggleTask?.(index, !checked)}
      >
        {checked && <Check className="size-[11px]" strokeWidth={3.2} aria-hidden="true" />}
      </button>
      <div className="tf-md-task-body">{renderBlocks(node.content, ctx)}</div>
      {ctx.onMoveTasks && text && (
        <button
          type="button"
          title="Pasar al checklist de la tarea"
          data-md-ui=""
          aria-label={`Pasar «${text}» al checklist`}
          onClick={() => ctx.onMoveTasks([index])}
          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/task:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100"
        >
          <ArrowRight className="size-3" />
          checklist
        </button>
      )}
    </li>
  )
}

/** Letras del documento dentro de un nodo (las menciones y los saltos de línea cuentan como una). */
function textLength(node) {
  if (node.type === 'text') return node.text.length
  if (node.type === 'mention' || node.type === 'hardBreak') return 1
  return (node.content ?? []).reduce((sum, child) => sum + textLength(child), 0)
}

/**
 * Tarjeta de la historia de usuario (Como / quiero / para). `textLength` son las letras de la cita en el documento
 * (para que un clic después de la tarjeta deje el cursor en su lugar al editar).
 */
export function UserStoryCard({ story, size = 'md', textLength: length = 0 }) {
  const row = (label, value, strong) => (
    <>
      <span className="font-mono text-[12.5px] leading-[22px] font-semibold text-accent-text">{label}</span>
      <span className={cn(strong && 'font-semibold', !value && 'text-muted-foreground')}>{value || '—'}</span>
    </>
  )
  return (
    <figure className="tf-md-story" aria-label="Historia de usuario" data-md-len={length}>
      <figcaption className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] text-accent-text uppercase">
        <UserRound className="size-[13px]" aria-hidden="true" />
        Historia de usuario
      </figcaption>
      <p className={cn('m-0 grid grid-cols-[64px_minmax(0,1fr)] gap-y-1 leading-[1.45]', size === 'sm' ? 'text-[14.5px]' : 'text-[15.5px]')}>
        {row('Como', story.como, true)}
        {row('quiero', story.quiero)}
        {row('para', story.para)}
      </p>
    </figure>
  )
}

/** Bloque de código con el lenguaje, «Copiar» y colores mínimos. */
export function CodeBlockView({ language, code }) {
  const tokens = useMemo(() => highlightCode(code, language), [code, language])
  return (
    <figure className="tf-md-code">
      <figcaption className="flex items-center justify-between gap-2 border-b py-1.5 pr-2 pl-3" data-md-ui="">
        <span className="font-mono text-[11px] text-muted-foreground">{language || 'código'}</span>
        <CopyButton text={code} />
      </figcaption>
      <pre>
        <code>
          {tokens.map((token, index) =>
            token.type === 'text' ? <Fragment key={index}>{token.text}</Fragment> : <span key={index} className={`tf-code-${token.type}`}>{token.text}</span>,
          )}
        </code>
      </pre>
    </figure>
  )
}

export function CopyButton({ text, className }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className={cn('flex items-center gap-1 rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground', className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          setCopied(false)
        }
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}
