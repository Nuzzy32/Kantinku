'use client'
import { useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
import { createCashier, createTenant, updateTenant, type AccountResult } from '@/app/admin/tenant/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/components/toast'
import { Field } from './field'
import type { AdminTenant } from './tenant-manager'

type Key = 'code' | 'name' | 'percent' | 'email'
type Errors = Partial<Record<Key, string>>
export type AccountDialogMode = { kind: 'tenant'; tenant: AdminTenant | null } | { kind: 'cashier' }

const FORM_ID = 'form-akun'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Aturan sama dengan server (app/admin/tenant/actions.ts) supaya pesan muncul sebelum dikirim.
function validate(v: Record<string, string>, mode: AccountDialogMode, existing: AdminTenant[]): Errors {
  const errors: Errors = {}
  if (mode.kind === 'tenant') {
    const code = v.code.trim().toUpperCase()
    const percent = Number(v.percent.trim().replace(',', '.'))
    if (!code) errors.code = 'Kode wajib diisi, contoh: T11.'
    else if (!/^[A-Z0-9]{1,6}$/.test(code)) errors.code = 'Kode hanya huruf dan angka, maksimal 6 karakter.'
    else if (existing.some((t) => t.code === code && t.id !== mode.tenant?.id)) errors.code = 'Kode sudah dipakai tenant lain.'
    if (!v.percent.trim() || !Number.isFinite(percent) || percent < 0 || percent > 100 || Math.round(percent * 100) !== percent * 100)
      errors.percent = 'Isi bagi hasil 0 sampai 100, maksimal 2 angka di belakang koma.'
  }
  if (!v.name.trim()) errors.name = mode.kind === 'tenant' ? 'Nama tenant wajib diisi.' : 'Nama kasir wajib diisi.'
  if (mode.kind === 'cashier' || !mode.tenant) {
    const email = v.email.trim().toLowerCase()
    if (!email) errors.email = 'Email wajib diisi.'
    else if (!EMAIL_RE.test(email)) errors.email = 'Format email belum benar, contoh: t11@kantinteknik.id.'
  }
  return errors
}

// Kata sandi sementara hanya tampil sekali di sini (tidak disimpan di mana pun selain Supabase Auth).
function PasswordNotice({ email, password }: { email: string; password: string }) {
  const toast = useToast()
  return (
    <div className="flex flex-col gap-3">
      <p>Akun login siap. Berikan data ini ke pemilik akun; kata sandi tidak bisa dilihat lagi setelah dialog ditutup.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-lg border bg-muted/50 p-3">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="font-medium break-all">{email}</dd>
        <dt className="text-muted-foreground">Kata sandi</dt>
        <dd className="font-mono text-base font-bold">{password}</dd>
      </dl>
      <Button variant="outline" onClick={() => navigator.clipboard.writeText(`${email}\n${password}`).then(() => toast('Email dan kata sandi disalin.'), () => toast('Gagal menyalin. Catat secara manual.'))}>
        <Copy aria-hidden /> Salin email & kata sandi
      </Button>
    </div>
  )
}

export function AccountDialog({ mode, onClose, existing }: { mode: AccountDialogMode | null; onClose: () => void; existing: AdminTenant[] }) {
  return (
    <Dialog open={!!mode} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">{mode && <AccountForm mode={mode} existing={existing} onClose={onClose} />}</DialogContent>
    </Dialog>
  )
}

// Terpasang ulang tiap dialog dibuka, jadi isian dan error selalu mulai bersih.
function AccountForm({ mode, existing, onClose }: { mode: AccountDialogMode; existing: AdminTenant[]; onClose: () => void }) {
  const toast = useToast()
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState('')
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null)
  const [pending, start] = useTransition()
  const editing = mode.kind === 'tenant' ? mode.tenant : null
  const title = mode.kind === 'cashier' ? 'Tambah akun kasir' : editing ? `Edit ${editing.name}` : 'Tambah tenant'

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending) return
    const form = e.currentTarget
    const v = Object.fromEntries(new FormData(form)) as Record<string, string>
    const found = validate(v, mode, existing)
    setErrors(found)
    setServerError('')
    const first = (['code', 'name', 'percent', 'email'] as const).find((k) => found[k])
    if (first) return (form.elements.namedItem(first) as HTMLInputElement | null)?.focus()

    const email = v.email?.trim().toLowerCase() ?? ''
    const fields = mode.kind === 'tenant' ? { code: v.code.trim().toUpperCase(), name: v.name.trim(), percent: Number(v.percent.trim().replace(',', '.')) } : null
    start(async () => {
      let result: AccountResult
      try {
        result = mode.kind === 'cashier' ? await createCashier({ name: v.name.trim(), email })
          : editing ? await updateTenant(editing.id, fields!)
          : await createTenant({ ...fields!, email })
      } catch { result = { error: 'Koneksi bermasalah. Coba lagi.' } }
      if (result.error) return setServerError(result.error)
      if (result.password) return setCreated({ email, password: result.password })
      toast('Tenant disimpan.')
      onClose()
    })
  }

  if (created) {
    return (
      <>
        <DialogHeader><DialogTitle>{mode.kind === 'cashier' ? 'Akun kasir dibuat' : 'Tenant & akun dibuat'}</DialogTitle></DialogHeader>
        <PasswordNotice {...created} />
        <DialogFooter><Button onClick={onClose}>Selesai</Button></DialogFooter>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {mode.kind === 'cashier' ? 'Kasir hanya bisa membuka layar Kasir.' : editing ? 'Email login tidak berubah.' : 'Akun login tenant dibuat bersamaan. Semua kolom wajib diisi.'}
        </DialogDescription>
      </DialogHeader>
      <form id={FORM_ID} noValidate onSubmit={submit} onChange={(e) => {
        const name = (e.target as unknown as HTMLInputElement).name as Key
        setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev))
      }} className="flex flex-col gap-4">
        {mode.kind === 'tenant' && (
          <Field label="Kode" name="code" defaultValue={editing?.code} error={errors.code} autoComplete="off" maxLength={6} className="uppercase" hint="Huruf dan angka, contoh T11." />
        )}
        <Field label={mode.kind === 'tenant' ? 'Nama tenant' : 'Nama kasir'} name="name" defaultValue={editing?.name} error={errors.name} autoComplete="off" maxLength={40} />
        {mode.kind === 'tenant' && (
          <Field label="Bagi hasil pengelola (%)" name="percent" defaultValue={editing?.sharePercent.toLocaleString('id-ID')} error={errors.percent} inputMode="decimal" autoComplete="off" hint="Bagian pengelola dari omzet, 0 sampai 100." />
        )}
        {!editing && <Field label="Email akun login" name="email" type="email" error={errors.email} autoComplete="off" />}
        {serverError && <p role="alert" className="text-sm font-medium text-destructive">{serverError}</p>}
      </form>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
        <Button type="submit" form={FORM_ID} disabled={pending}>
          {pending ? 'Menyimpan…' : editing ? 'Simpan' : 'Buat akun'}
        </Button>
      </DialogFooter>
    </>
  )
}
