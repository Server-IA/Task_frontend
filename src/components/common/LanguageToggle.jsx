import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getLanguage, LANGUAGES, setLanguage, t } from '@/i18n'

/**
 * Botón para cambiar el idioma en las pantallas públicas (antes de entrar no hay perfil donde guardarlo: queda en el
 * navegador). Con sesión, el idioma se cambia en el perfil.
 */
export function LanguageToggle() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t('Idioma')} className="gap-1.5 px-2 font-mono text-xs uppercase">
          <Languages className="size-4" />
          {getLanguage()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('Idioma')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={getLanguage()} onValueChange={(code) => setLanguage(code)}>
          {LANGUAGES.map(({ code, label }) => (
            <DropdownMenuRadioItem key={code} value={code}>
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
