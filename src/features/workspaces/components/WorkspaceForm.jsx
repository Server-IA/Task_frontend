import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/common/Loaders'
import { applyFieldErrors } from '@/lib/errors'
import { notifyError } from '@/lib/notify'
import { slugify } from '@/lib/slug'
import { workspaceSchema } from '../schemas'

/**
 * Nombre + slug. Mientras el usuario no edite el slug, se sugiere a partir del nombre.
 * @param {{ defaultValues?: { name: string, slug: string }, onSubmit: Function, pending: boolean, submitLabel: string, disabled?: boolean }} props
 */
export function WorkspaceForm({ defaultValues, onSubmit, pending, submitLabel, disabled = false, footer }) {
  const isEdit = Boolean(defaultValues)
  const slugTouched = useRef(isEdit)
  const form = useForm({
    resolver: zodResolver(workspaceSchema),
    defaultValues: defaultValues ?? { name: '', slug: '' },
  })
  const name = useWatch({ control: form.control, name: 'name' })

  useEffect(() => {
    if (!slugTouched.current) {
      form.setValue('slug', slugify(name ?? ''), { shouldValidate: form.formState.isSubmitted })
    }
  }, [name, form])

  const handleSubmit = (values) =>
    onSubmit(values, {
      onError: (error) => {
        if (!applyFieldErrors(error, form.setError)) notifyError(error)
      },
    })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del workspace</FormLabel>
              <FormControl>
                <Input placeholder="Equipo de producto" autoFocus={!isEdit} disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <div className="flex items-center rounded-md border border-input shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                  <span className="pl-3 text-sm text-muted-foreground select-none">
                    {window.location.host}/
                  </span>
                  <input
                    className="h-9 min-w-0 flex-1 bg-transparent pr-3 text-sm outline-none disabled:opacity-50"
                    disabled={disabled}
                    {...field}
                    onChange={(event) => {
                      slugTouched.current = true
                      field.onChange(event.target.value.toLowerCase())
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>Solo minúsculas, números y guiones.</FormDescription>
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
