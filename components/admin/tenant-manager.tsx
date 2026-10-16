'use client'
import { startTransition, useOptimistic, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { setTenantActive } from '@/app/admin/tenant/actions'
import { Pill } from '@/components/pill'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AccountDialog, type AccountDialogMode } from './account-dialog'
import { RowTh, TableWrap, Td, Th } from './data-table'

export type AdminTenant = { id: number; code: string; name: string; sharePercent: number; isActive: boolean; email: string }
export type Cashier = { id: string; name: string; email: string }

// Data dari server (page.tsx). Aktif/nonaktif tampil langsung; gagal = kembali semula + pesan.
export function TenantManager({ tenants, cashiers }: { tenants: AdminTenant[]; cashiers: Cashier[] }) {
  const toast = useToast()
  const [dialog, setDialog] = useState<AccountDialogMode | null>(null)
  const [list, apply] = useOptimistic(tenants, (prev, c: { id: number; isActive: boolean }) =>
    prev.map((t) => (t.id === c.id ? { ...t, isActive: c.isActive } : t)))

  const setActive = (t: AdminTenant, isActive: boolean, undo = true) =>
    startTransition(async () => {
      apply({ id: t.id, isActive })
      const { error } = await setTenantActive(t.id, isActive).catch(() => ({ error: 'Koneksi bermasalah. Coba lagi.' }))
      if (error) return toast(error)
      if (undo) toast(`${t.name} ${isActive ? 'diaktifkan' : 'dinonaktifkan'}.`, { label: 'Urungkan', onClick: () => setActive(t, !isActive, false) })
    })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant</h1>
          <p className="text-sm text-muted-foreground">Tenant nonaktif hilang dari menu pembeli dan tidak bisa menerima pesanan baru.</p>
        </div>
        <Button onClick={() => setDialog({ kind: 'tenant', tenant: null })}>
          <Plus aria-hidden /> Tambah tenant
        </Button>
      </div>

      <TableWrap caption="Daftar tenant, bagi hasil, dan akun login">
        <thead>
          <tr>
            <Th>Kode</Th>
            <Th>Tenant</Th>
            <Th right>Bagi hasil</Th>
            <Th>Akun login</Th>
            <Th>Status</Th>
            <Th right>Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && (
            <tr><Td colSpan={6} className="py-8 text-center text-muted-foreground">Belum ada tenant. Tambahkan tenant pertama.</Td></tr>
          )}
          {list.map((t) => (
            <tr key={t.id} className={cn('border-b last:border-b-0', !t.isActive && 'bg-muted/40 text-muted-foreground')}>
              <RowTh>{t.code}</RowTh>
              <Td className="font-medium">{t.name}</Td>
              <Td right>{t.sharePercent.toLocaleString('id-ID')}%</Td>
              <Td className="break-all">{t.email || '—'}</Td>
              <Td>
                <Pill tone={t.isActive ? 'brand' : 'neutral'}>{t.isActive ? 'Aktif' : 'Nonaktif'}</Pill>
              </Td>
              <Td right>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialog({ kind: 'tenant', tenant: t })}>
                    <Pencil aria-hidden /> Edit<span className="sr-only"> {t.name}</span>
                  </Button>
                  <Button variant={t.isActive ? 'destructive' : 'outline'} onClick={() => setActive(t, !t.isActive)}>
                    {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    <span className="sr-only"> {t.name}</span>
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <section aria-labelledby="kasir" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="kasir" className="text-lg font-bold">Akun kasir</h2>
            <p className="text-sm text-muted-foreground">Kasir mencatat pesanan tunai dan hanya bisa membuka layar Kasir.</p>
          </div>
          <Button variant="outline" onClick={() => setDialog({ kind: 'cashier' })}>
            <Plus aria-hidden /> Tambah kasir
          </Button>
        </div>
        {cashiers.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground">Belum ada akun kasir.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {cashiers.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <span className="font-medium">{c.name}</span>
                <span className="break-all text-muted-foreground">{c.email}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AccountDialog mode={dialog} onClose={() => setDialog(null)} existing={tenants} />
    </div>
  )
}
