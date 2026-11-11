import { useRef, useState } from 'react'
import { Lock, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/common/Loaders'
import { useProjects } from '@/features/projects/hooks'
import { t, tn } from '@/i18n'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useConnectImport, useSelectImport, useUploadImport } from './hooks'
import { csvFields, DEFAULT_OPTIONS, initialChoices, MAX_UPLOAD_BYTES, readAsBase64, toSelection } from './importModel'
import { WizardShell } from './ImportParts'

const FIELD = 'flex flex-col gap-1.5 text-sm font-medium'
const HINT = 'font-mono text-[11px] font-normal text-muted-foreground'

/**
 * Paso «Conectar»: entrar a la herramienta con sus credenciales o subir el archivo que exporta. Al conectar (o al
 * leerse el archivo) nace la importación y se pasa a elegir qué traer.
 */
export function ConnectStep({ workspace, source, onCancel, onJob }) {
  const [via, setVia] = useState(source.api ? 'api' : 'file')
  const [values, setValues] = useState({ baseUrl: '', email: '', token: '' })
  const connect = useConnectImport(workspace.slug)
  const upload = useUploadImport(workspace.slug)
  const fileInput = useRef(null)
  const busy = connect.isPending || upload.isPending

  const submit = (event) => {
    event.preventDefault()
    const body = { source: source.key, token: values.token.trim() }
    for (const field of source.api.fields) body[field.name] = values[field.name].trim()
    connect.mutate(body, { onSuccess: onJob, onError: (error) => notifyError(error, t('No se pudo conectar')) })
  }

  const pickFile = async (file) => {
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      notifyError(new Error(t('El archivo pesa más de 25 MB. Expórtalo por partes (por proyecto, por ejemplo).')))
      return
    }
    try {
      const contentBase64 = await readAsBase64(file)
      upload.mutate(
        { source: source.key, fileName: file.name, contentBase64 },
        { onSuccess: onJob, onError: (error) => notifyError(error, t('No se pudo leer el archivo')) },
      )
    } catch {
      notifyError(new Error(t('No se pudo leer el archivo')))
    }
  }

  const complete = source.api?.fields.every((field) => values[field.name].trim() !== '') ?? false

  return (
    <WizardShell source={source} step="connect" onExit={onCancel}>
      <section aria-labelledby="import-via-title" className="tf-panel flex flex-col gap-4 px-5 pt-4.5 pb-5">
        <h2 id="import-via-title" className="text-[15px] font-semibold">
          {t('¿Cómo quieres traer los datos?')}
        </h2>
        {source.api && (
          <div role="radiogroup" aria-labelledby="import-via-title" className="grid gap-3 sm:grid-cols-2">
            {[
              ['api', source.api],
              ['file', source.file],
            ].map(([key, option]) => (
              <label
                key={key}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-[14px] border px-4 py-3.5 transition-colors duration-150',
                  via === key ? 'border-ring bg-accent-soft' : 'hover:border-dash',
                )}
              >
                <input type="radio" name="import-via" className="mt-1 accent-(--ring)" checked={via === key} onChange={() => setVia(key)} />
                <span>
                  <span className="block font-semibold">{option.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">{option.note}</span>
                </span>
              </label>
            ))}
          </div>
        )}

        {via === 'api' ? (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-3.5 sm:grid-cols-2">
              {source.api.fields.map((field, index) => (
                <label key={field.name} className={cn(FIELD, source.api.fields.length % 2 === 1 && index === 0 && 'sm:col-span-2')}>
                  {field.label}
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    value={values[field.name]}
                    onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                  {field.hint && <span className={HINT}>{field.hint}</span>}
                </label>
              ))}
            </div>
            <p className="flex gap-2.5 rounded-xl bg-muted px-3 py-2.5 text-[12.5px] leading-normal text-muted-foreground">
              <Lock className="mt-0.5 size-4 shrink-0" />
              <span>
                {t(
                  'Las credenciales se usan solo durante esta importación y no se guardan. Con ellas TaskFlow lee lo que tu cuenta puede ver en {source}; no crea, cambia ni borra nada allá.',
                  { source: source.name },
                )}
              </span>
            </p>
            <div className="flex justify-end">
              <Button type="submit" disabled={busy || !complete}>
                {connect.isPending && <Spinner />}
                {connect.isPending ? t('Conectando…') : t('Conectar y continuar')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {!source.api && <p className="text-[13px] leading-snug text-muted-foreground">{source.file.note}</p>}
            <input
              ref={fileInput}
              type="file"
              accept={source.file.accept}
              className="sr-only"
              aria-label={source.file.title}
              onChange={(event) => {
                pickFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                pickFile(event.dataTransfer.files?.[0])
              }}
              className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-dash px-4 py-6 text-center transition-colors duration-150 hover:border-foreground/40 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
            >
              {upload.isPending ? <Spinner /> : <Upload className="size-5 text-muted-foreground" />}
              <span className="font-semibold">{upload.isPending ? t('Leyendo el archivo…') : t('Elige el archivo o suéltalo aquí')}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{t('hasta 25 MB')}</span>
            </button>
          </div>
        )}
      </section>
    </WizardShell>
  )
}

const OPTIONS = [
  ['keepNumbers', () => t('Conservar los números'), () => t('PORT-123 sigue siendo PORT-123: los enlaces y las menciones viejas siguen sirviendo. Solo en proyectos nuevos.')],
  ['completed', () => t('Tareas ya terminadas'), () => t('Con su fecha de cierre original. Sin ellas solo entra lo que está abierto.')],
  ['comments', () => t('Comentarios'), () => t('Con el nombre de quien los escribió y su fecha.')],
  ['attachments', () => t('Adjuntos'), () => t('Los de más de 10 MB (5 MB si son imágenes) no se traen.')],
  ['closedSprints', () => t('Sprints cerrados'), () => t('Entran como ciclos cerrados, con lo que se completó en cada uno.')],
  ['archived', () => t('Tareas archivadas'), () => t('Normalmente no hacen falta.')],
]

/**
 * Paso «Qué importar»: qué proyectos del origen se traen y dónde queda cada uno, las opciones y, con un archivo CSV,
 * qué es cada columna. Al continuar se lee del origen lo elegido.
 */
export function ChooseStep({ workspace, job, onDone }) {
  const { data: projects = [] } = useProjects(workspace.slug)
  const select = useSelectImport(workspace.slug, job.id)
  const csv = job.discovery?.csv ?? null
  const [choices, setChoices] = useState(() => initialChoices(job))
  const [options, setOptions] = useState(() => ({ ...DEFAULT_OPTIONS, ...job.selection?.options }))
  const [columns, setColumns] = useState(() => job.selection?.csv?.columns ?? csv?.columns.map((column) => column.suggested) ?? null)

  const found = job.discovery?.projects ?? []
  const chosen = found.filter((project) => choices[project.id]?.include)
  const issueTotal = chosen.reduce((sum, project) => sum + Math.max(0, project.issueCount), 0)
  const setChoice = (id, change) => setChoices((current) => ({ ...current, [id]: { ...current[id], ...change } }))
  const hasTitle = !csv || columns.includes('TITLE')
  const fromFile = job.via === 'FILE'
  // Con un archivo no hay de dónde bajar adjuntos, ni sprints cerrados ni archivadas que distinguir
  const shownOptions = OPTIONS.filter(([key]) => !fromFile || !['attachments', 'closedSprints', 'archived'].includes(key))

  const submit = () =>
    select.mutate(toSelection(job, choices, options, columns), {
      onSuccess: onDone,
      onError: (error) => notifyError(error, t('No se pudo continuar')),
    })

  return (
    <>
      {job.error && (
        <p role="alert" className="rounded-2xl border border-late/40 bg-late-soft px-4 py-3 text-sm text-late">
          {job.error}
        </p>
      )}
      {job.discovery?.account && (
        <p className="flex items-center gap-2 px-1 text-[13px] text-muted-foreground">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ok-dot" />
          {t('Conectado como {name}', { name: job.discovery.account })}
          {!job.connected && <span className="text-late">· {t('la conexión caducó: para continuar vuelve a conectar')}</span>}
        </p>
      )}

      {csv && (
        <section aria-labelledby="import-columns-title" className="overflow-x-auto rounded-2xl border bg-card">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
            <h2 id="import-columns-title" className="text-[15px] font-semibold">
              {t('Columnas del archivo')}
            </h2>
            <span className="text-[12.5px] text-muted-foreground">
              {t('Di a qué campo va cada una. Solo el título es obligatorio.')} · {tn(csv.rows, '{count} fila', '{count} filas')}
            </span>
          </div>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                  {t('Columna')}
                </th>
                <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                  {t('Ejemplos del archivo')}
                </th>
                <th scope="col" className="w-72 px-4 py-2.25 text-left font-semibold">
                  {t('Campo en TaskFlow')}
                </th>
              </tr>
            </thead>
            <tbody>
              {csv.columns.map((column, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2.25 font-mono text-[12.5px] font-semibold whitespace-nowrap">{column.name || '—'}</td>
                  <td className="max-w-0 truncate px-4 py-2.25 text-[13px] text-muted-foreground" title={column.samples.join(' · ')}>
                    {column.samples.join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-2.25">
                    <Select value={columns[index] ?? 'IGNORE'} onValueChange={(value) => setColumns((current) => current.map((field, at) => (at === index ? value : field)))}>
                      <SelectTrigger
                        aria-label={t('Campo de la columna {name}', { name: column.name })}
                        className={cn('h-8.5 w-full', (columns[index] ?? 'IGNORE') === 'IGNORE' && 'border-dashed text-muted-foreground')}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {csvFields().map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasTitle && (
            <p role="alert" className="border-t px-4 py-2.5 text-[13px] text-late">
              {t('Elige qué columna es el título de la tarea.')}
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="import-projects-title" className="overflow-x-auto rounded-2xl border bg-card">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-4 pt-3.5 pb-2.5">
          <h2 id="import-projects-title" className="text-[15px] font-semibold">
            {t('Proyectos')}
          </h2>
          <span className="text-[12.5px] text-muted-foreground">{t('Elige cuáles traer y dónde quedan.')}</span>
        </div>
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="bg-subtle font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('En el origen')}
              </th>
              <th scope="col" className="px-4 py-2.25 text-left font-semibold">
                {t('Contiene')}
              </th>
              <th scope="col" className="w-[46%] px-4 py-2.25 text-left font-semibold">
                {t('En TaskFlow')}
              </th>
            </tr>
          </thead>
          <tbody>
            {found.map((project) => {
              const choice = choices[project.id]
              return (
                <tr key={project.id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <label className={cn('flex items-center gap-2.5 font-medium', !choice.include && 'text-muted-foreground')}>
                      <Checkbox checked={choice.include} onCheckedChange={(checked) => setChoice(project.id, { include: checked === true })} />
                      {project.key && <span className="rounded-[5px] bg-muted px-1.5 py-px font-mono text-[10px] font-semibold">{project.key}</span>}
                      {project.name}
                    </label>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">
                    {project.issueCount >= 0 ? tn(project.issueCount, '{count} tarea', '{count} tareas') : t('se cuenta al leerlo')}
                  </td>
                  <td className="px-4 py-2.5">
                    {choice.include ? (
                      <div className="flex flex-col gap-2">
                        <Select value={choice.target} onValueChange={(target) => setChoice(project.id, { target })}>
                          <SelectTrigger aria-label={t('Dónde queda {name}', { name: project.name })} className="h-8.5 w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">{t('Proyecto nuevo')}</SelectItem>
                            {projects.map((existing) => (
                              <SelectItem key={existing.id} value={existing.id}>
                                {t('Agregar a «{name}»', { name: existing.name })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {choice.target === 'new' && (
                          <div className="flex gap-2">
                            <Input
                              aria-label={t('Nombre del proyecto nuevo')}
                              className="h-8.5 flex-1"
                              maxLength={80}
                              value={choice.name}
                              onChange={(event) => setChoice(project.id, { name: event.target.value })}
                            />
                            <Input
                              aria-label={t('Identificador del proyecto nuevo')}
                              className="h-8.5 w-28 font-mono uppercase"
                              maxLength={12}
                              value={choice.identifier}
                              onChange={(event) => setChoice(project.id, { identifier: event.target.value.replace(/[^A-Za-z0-9]/g, '') })}
                            />
                          </div>
                        )}
                        {choice.target === 'new' && project.identifierTaken && (
                          <span className="text-xs text-soon">
                            {t('Ya tienes un proyecto {key}: se crea aparte como {identifier}, o elige agregarlo a uno que ya existe.', {
                              key: project.key,
                              identifier: choice.identifier || project.suggestedIdentifier,
                            })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">{t('No se importa')}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section aria-labelledby="import-options-title" className="tf-panel flex flex-col gap-3 px-5 py-4.5">
        <h2 id="import-options-title" className="text-[15px] font-semibold">
          {t('Opciones')}
        </h2>
        <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {shownOptions.map(([key, label, note]) => (
            <label key={key} className="flex items-start gap-2.5">
              <Checkbox className="mt-0.5" checked={options[key]} onCheckedChange={(checked) => setOptions((current) => ({ ...current, [key]: checked === true }))} />
              <span>
                <span className="block font-medium">{label()}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{note()}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {tn(chosen.length, '{count} proyecto', '{count} proyectos')}
            {issueTotal > 0 && <> · {tn(issueTotal, '{count} tarea', '{count} tareas')}</>}
          </span>
          <Button onClick={submit} disabled={select.isPending || chosen.length === 0 || !hasTitle || (job.via === 'API' && !job.connected)}>
            {select.isPending && <Spinner />}
            {t('Continuar')}
          </Button>
        </div>
      </section>
    </>
  )
}
