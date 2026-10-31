import { useRef, useState } from 'react'
import { Camera, Check, ImagePlus, RotateCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/common/Loaders'
import { AvatarPhoto, UserAvatar, avatarColor, initials } from '@/components/common/UserAvatar'
import { AVATAR_ACCEPT } from '@/features/files/fileTypes'
import { notifyError } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { AvatarCropDialog } from './AvatarCropDialog'
import { useAvatarUpload, useRemoveAvatar } from './avatarHooks'
import { validateAvatarFile } from './cropImage'

/**
 * «Foto de perfil» y «Así te ven»: subir (con recorte), cambiar o quitar la foto y verla en los tamaños de la app.
 * @param {{ user: import('@/api/types').UserResponse }} props
 */
export function ProfilePhotoSection({ user }) {
  return (
    <div className="grid items-stretch gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <PhotoCard user={user} />
      <SeenCard user={user} />
    </div>
  )
}

const STATUS = { queued: 'En cola…', confirming: 'Guardando…' }

function PhotoCard({ user }) {
  const inputRef = useRef(null)
  const [picked, setPicked] = useState(null)
  const [problem, setProblem] = useState(null)
  const [dragging, setDragging] = useState(false)
  const upload = useAvatarUpload()
  const remove = useRemoveAvatar()
  const { task, active } = upload

  const hasPhoto = Boolean(user.avatarUrl)
  const busy = active || remove.isPending
  const actionLabel = hasPhoto ? 'Cambiar foto' : 'Subir foto'
  // Mientras sube se ve el recorte nuevo; si falla, vuelve la foto que había
  const shown = active ? task.meta.previewUrl : user.avatarUrl

  const pickFile = () => inputRef.current?.click()

  const choose = (file) => {
    if (!file) return
    const check = validateAvatarFile(file)
    if (!check.ok) {
      setPicked(null)
      setProblem(check.error)
      return
    }
    setProblem(null)
    setPicked(file)
  }

  const removePhoto = () => {
    upload.clear()
    remove.mutate(undefined, {
      onSuccess: () => toast.success('Foto quitada', { description: 'Se usan tus iniciales y tu color.' }),
      onError: (error) => notifyError(error, 'No se pudo quitar la foto'),
    })
  }

  return (
    <Card className="gap-3.5">
      <CardHeader>
        <CardTitle>Foto de perfil</CardTitle>
        <CardDescription>Se ve en la barra lateral, en tareas, comentarios y listas de miembros.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <div className="flex items-center gap-[18px]">
          <button
            type="button"
            className={cn(
              'group/photo relative size-24 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3 focus-visible:ring-offset-card disabled:cursor-default',
              dragging && 'ring-2 ring-ring ring-offset-3 ring-offset-card',
            )}
            aria-label={actionLabel}
            disabled={busy}
            onClick={pickFile}
            onDragOver={(event) => {
              if (busy || !event.dataTransfer.types.includes('Files')) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'copy'
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              setDragging(false)
              if (busy) return
              event.preventDefault()
              choose(event.dataTransfer.files?.[0])
            }}
          >
            <Avatar className="size-24">
              <AvatarPhoto src={shown} alt={`Foto de ${user.fullName}`} />
              <AvatarFallback className={cn('font-display text-[34px] font-extrabold text-[#23201B]', avatarColor(user.fullName))}>
                {initials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            {active ? (
              <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-full bg-[rgb(35_32_27/0.55)] font-mono text-xs font-semibold text-white">
                {task.status === 'uploading' ? `${Math.round(task.progress * 100)} %` : <Spinner />}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-[rgb(35_32_27/0.55)] text-[11.5px] font-semibold text-white opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100',
                  dragging && 'opacity-100',
                )}
              >
                <Camera className="size-5" />
                {dragging ? 'Soltar aquí' : actionLabel}
              </span>
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <Button className="rounded-[11px]" disabled={busy} onClick={pickFile}>
                <Upload className="size-[15px]" strokeWidth={2.2} />
                {actionLabel}
              </Button>
              {hasPhoto && (
                <Button variant="outline" className="rounded-[11px] font-medium text-late hover:text-late" disabled={busy} onClick={removePhoto}>
                  {remove.isPending && <Spinner />}
                  Quitar foto
                </Button>
              )}
            </div>
            <p className="font-mono text-[11.5px] leading-relaxed text-muted-foreground">PNG, JPG o WebP · hasta 5 MB · se recorta en cuadrado</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            className="hidden"
            data-testid="avatar-input"
            onChange={(event) => {
              choose(event.target.files?.[0])
              // Así se puede volver a elegir el mismo archivo
              event.target.value = ''
            }}
          />
        </div>
        <PhotoStatus task={task} problem={problem} hasPhoto={hasPhoto} onCancel={upload.clear} onRetry={upload.retry} />
      </CardContent>
      <AvatarCropDialog
        file={picked}
        onCancel={() => setPicked(null)}
        onPickAnother={pickFile}
        onError={(message) => {
          setPicked(null)
          setProblem(message)
        }}
        onSave={(blob) => {
          setPicked(null)
          setProblem(null)
          upload.start(blob)
        }}
      />
    </Card>
  )
}

/** Debajo de la foto: el error al elegirla, el avance de la subida, su error o «Foto actualizada». */
function PhotoStatus({ task, problem, hasPhoto, onCancel, onRetry }) {
  const box = 'flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px]'

  if (problem) {
    return (
      <p role="alert" className={cn(box, 'bg-late-soft text-late')}>
        {problem}
      </p>
    )
  }
  if (task?.status === 'error') {
    return (
      <div role="alert" className={cn(box, 'bg-late-soft py-2 text-late')}>
        <span className="min-w-0 flex-1">No se pudo subir la foto. {task.error}</span>
        {task.retryable && (
          <Button variant="outline" size="sm" className="h-7 bg-card text-foreground" onClick={onRetry}>
            <RotateCw className="size-3" />
            Reintentar
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 text-foreground" onClick={onCancel}>
          Descartar
        </Button>
      </div>
    )
  }
  if (task && task.status !== 'done') {
    const percent = Math.round(task.progress * 100)
    const label = task.status === 'uploading' ? `Subiendo foto… ${percent} %` : STATUS[task.status]
    return (
      <div role="status" className={cn(box, 'border py-2')}>
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[11.5px] text-muted-foreground">{label}</span>
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <span className="block h-full rounded-full bg-ring transition-[width] duration-200" style={{ width: `${task.status === 'queued' ? 0 : percent}%` }} />
          </span>
        </span>
        {task.status !== 'confirming' && (
          <Button variant="ghost" size="sm" className="h-7" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    )
  }
  if (task?.status === 'done') {
    return (
      <p role="status" className={cn(box, 'bg-ok-soft py-[9px] text-ok')}>
        <Check className="size-3.5 shrink-0" strokeWidth={2.6} aria-hidden="true" />
        Foto actualizada. El equipo la ve en unos segundos.
      </p>
    )
  }
  return (
    <p className={cn(box, 'border border-dashed border-dash text-muted-foreground')}>
      <ImagePlus className="size-3.5 shrink-0" aria-hidden="true" />
      {hasPhoto ? 'También puedes soltar una imagen sobre tu foto.' : 'También puedes soltar una imagen sobre tu avatar. Sin foto, se usan tus iniciales y tu color.'}
    </p>
  )
}

/** «Así te ven»: la foto (o las iniciales) en los tamaños de miembros, comentarios y tarjetas. */
function SeenCard({ user }) {
  const hasPhoto = Boolean(user.avatarUrl)
  const row = 'flex items-center gap-2.5 rounded-xl border px-2.5 py-2'
  const caption = 'w-[70px] shrink-0 font-mono text-[11px] text-muted-foreground'
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Así te ven</CardTitle>
        <CardDescription>{hasPhoto ? 'Tu foto, en todos los tamaños de la app.' : 'Sin foto: tus iniciales sobre tu color.'}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className={row}>
          <span className={caption}>miembros</span>
          <UserAvatar user={user} className="size-[34px] text-xs" />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-semibold">
              {user.fullName} <span className="font-normal text-muted-foreground">(tú)</span>
            </span>
            <span className="font-mono text-[11.5px] text-muted-foreground">Miembro</span>
          </span>
        </div>
        <div className={cn(row, 'items-start')}>
          <span className={cn(caption, 'pt-1.5')}>comentario</span>
          <UserAvatar user={user} className="size-7 text-[10px]" />
          <span className="min-w-0 flex-1 text-[13px] leading-normal">
            <strong className="font-semibold">{user.fullName}</strong> <span className="font-mono text-[11px] text-muted-foreground">· ahora</span>
            <br />
            Listo el arreglo del botón Guardar.
          </span>
        </div>
        <div className={row}>
          <span className={caption}>tarjeta</span>
          <span className="font-mono text-[11px] text-muted-foreground">WEB-15</span>
          <span className="ml-auto flex">
            <UserAvatar user={{ id: 'ejemplo', fullName: 'Ana Núñez', avatarUrl: null }} size="sm" className="text-[9px] ring-2 ring-card" />
            <UserAvatar user={user} size="sm" className="-ml-1.5 text-[9px] ring-2 ring-card" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
