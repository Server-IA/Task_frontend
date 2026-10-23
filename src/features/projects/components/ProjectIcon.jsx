import { cn } from '@/lib/utils'

const COLORS = [
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
]

function colorFor(text = '') {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return COLORS[Math.abs(hash) % COLORS.length]
}

/** Cuadro con la inicial del proyecto; el color depende del identificador. */
export function ProjectIcon({ project, className }) {
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold',
        colorFor(project?.identifier),
        className,
      )}
    >
      {project?.name?.trim().charAt(0).toUpperCase() ?? '?'}
    </span>
  )
}
