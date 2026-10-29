import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from '@/hooks/useTheme'

export const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

/** Opciones de tema para usar dentro de cualquier DropdownMenuContent. */
export function ThemeRadioItems() {
  const { theme, setTheme } = useTheme()
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon className="size-4" />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}

/** Botón independiente para cambiar el tema (pantallas públicas). */
export function ThemeToggle() {
  const { resolvedTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Cambiar tema">
          {resolvedTheme === 'dark' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Tema</DropdownMenuLabel>
        <ThemeRadioItems />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
