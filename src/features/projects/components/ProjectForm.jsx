import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/common/Loaders'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { projectSchema, suggestIdentifier } from '../schemas'
import { ProjectColorPicker } from './ProjectColorPicker'

/**
 * Nombre, identificador (prefijo de los issues), color y descripción.
 * Al crear, el identificador se sugiere desde el nombre hasta que el usuario lo edita, y el color empieza en
 * `suggestedColor` (el menos usado del workspace).
 */
export function ProjectForm({
  defaultValues,
  suggestedColor = 'TEAL',
  onSubmit,
  pending,
  submitLabel,
  disabled = false,
  footer,
}) {
  const isEdit = Boolean(defaultValues)
  const identifierTouched = useRef(isEdit)
  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: defaultValues ?? { name: '', identifier: '', description: '', color: suggestedColor },
  })
  const [name, identifier] = useWatch({ control: form.control, name: ['name', 'identifier'] })

  useEffect(() => {
    if (!identifierTouched.current) form.setValue('identifier', suggestIdentifier(name ?? ''))
  }, [name, form])

  const handleSubmit = (values) =>
    onSubmit(
      { ...values, identifier: values.identifier.toUpperCase() },
      {
        onError: (error) => {
          if (!applyFieldErrors(error, form.setError)) notifyError(error)
        },
      },
    )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Sitio web" autoFocus={!isEdit} disabled={disabled} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificador</FormLabel>
                <FormControl>
                  <Input
                    placeholder="WEB"
                    className="font-mono uppercase"
                    maxLength={12}
                    disabled={disabled}
                    {...field}
                    onChange={(event) => {
                      identifierTouched.current = true
                      field.onChange(event.target.value.toUpperCase())
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormDescription className="-mt-2">
          El identificador es el prefijo de las tareas: {identifier || 'WEB'}-1, -2, -3…
        </FormDescription>
        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <ProjectColorPicker
                value={field.value}
                onChange={(color) => field.onChange(color)}
                identifier={identifier}
                disabled={disabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="¿De qué trata el proyecto? (opcional)" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!disabled && (
          <div className="flex justify-end gap-2">
            {footer}
            <Button type="submit" disabled={pending || (isEdit && !form.formState.isDirty)}>
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </div>
        )}
      </form>
    </Form>
  )
}
