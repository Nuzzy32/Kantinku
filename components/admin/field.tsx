'use client'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Label yang terlihat + input + petunjuk atau pesan error tepat di bawahnya.
export function Field({ label, error, hint, id, ...props }: React.ComponentProps<typeof Input> & { label: string; error?: string; hint?: string }) {
  const uid = useId()
  const inputId = id ?? uid
  const noteId = `${inputId}-note`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} aria-invalid={error ? true : undefined} aria-describedby={error || hint ? noteId : undefined} {...props} />
      {error ? (
        <p id={noteId} className="text-sm font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p id={noteId} className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
