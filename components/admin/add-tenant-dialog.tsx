'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Tenant } from '@/lib/types'
import { Field } from './field'

type NewTenant = Pick<Tenant, 'code' | 'name' | 'sharePercent' | 'email'>
type Errors = Partial<Record<'code' | 'name' | 'percent' | 'email', string>>

const FORM_ID = 'tambah-tenant'

// Wajib semua. Aturan mengikuti docs/schema.sql: kode unik per kantin, bagi hasil 0-100.
function validate(v: Record<string, string>, existing: Tenant[]): Errors {
  const errors: Errors = {}
  const code = v.code.trim().toUpperCase()
  const percent = Number(v.percent.trim().replace(',', '.'))
  const email = v.email.trim().toLowerCase()

  if (!code) errors.code = 'Kode wajib diisi, contoh: T11.'
  else if (!/^[A-Z0-9]{1,6}$/.test(code)) errors.code = 'Kode hanya huruf dan angka, maksimal 6 karakter.'
  else if (existing.some((t) => t.code === code)) errors.code = 'Kode sudah dipakai tenant lain.'

  if (!v.name.trim()) errors.name = 'Nama tenant wajib diisi.'

  if (!v.percent.trim() || !Number.isFinite(percent) || percent < 0 || percent > 100) errors.percent = 'Isi bagi hasil dengan angka 0 sampai 100.'

  if (!email) errors.email = 'Email wajib diisi.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Format email belum benar, contoh: t11@kantinteknik.id.'
  else if (existing.some((t) => t.email.toLowerCase() === email)) errors.email = 'Email ini sudah dipakai tenant lain.'
  return errors
}

export function AddTenantDialog({ open, onOpenChange, existing, onCreate }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: Tenant[]
  onCreate: (tenant: NewTenant) => void
}) {
  const [errors, setErrors] = useState<Errors>({})

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>
    const found = validate(v, existing)
    setErrors(found)
    const first = (['code', 'name', 'percent', 'email'] as const).find((k) => found[k])
    if (first) {
      ;(form.elements.namedItem(first) as HTMLInputElement | null)?.focus()
      return
    }
    onCreate({
      code: v.code.trim().toUpperCase(),
      name: v.name.trim(),
      sharePercent: Number(v.percent.trim().replace(',', '.')),
      email: v.email.trim().toLowerCase(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setErrors({}) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah tenant</DialogTitle>
          <DialogDescription>Akun login tenant dibuat bersamaan. Semua kolom wajib diisi.</DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} noValidate onSubmit={submit} onChange={(e) => {
          const name = (e.target as unknown as HTMLInputElement).name as keyof Errors
          setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
        }} className="flex flex-col gap-4">
          <Field label="Kode" name="code" error={errors.code} autoComplete="off" maxLength={6} className="uppercase" hint="Huruf dan angka, contoh T11." />
          <Field label="Nama tenant" name="name" error={errors.name} autoComplete="off" maxLength={40} />
          <Field label="Bagi hasil pengelola (%)" name="percent" error={errors.percent} inputMode="decimal" autoComplete="off" hint="Bagian pengelola dari omzet, 0 sampai 100." />
          <Field label="Email akun login" name="email" type="email" error={errors.email} autoComplete="off" />
        </form>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button type="submit" form={FORM_ID}>Buat tenant</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
