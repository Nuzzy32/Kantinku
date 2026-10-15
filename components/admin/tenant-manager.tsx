'use client'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Pill } from '@/components/pill'
import { useToast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { tenants as seed } from '@/lib/mock'
import type { Tenant } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AddTenantDialog } from './add-tenant-dialog'
import { RowTh, TableWrap, Td, Th } from './data-table'

// Data contoh di state lokal (Story 14 menyambung ke tabel tenants + akun login).
export function TenantManager() {
  const toast = useToast()
  const [list, setList] = useState<Tenant[]>(seed)
  const [adding, setAdding] = useState(false)

  const setActive = (id: number, isActive: boolean) =>
    setList((prev) => prev.map((t) => (t.id === id ? { ...t, isActive } : t)))

  const toggle = (t: Tenant) => {
    setActive(t.id, !t.isActive)
    toast(`${t.name} ${t.isActive ? 'dinonaktifkan' : 'diaktifkan'}.`, { label: 'Urungkan', onClick: () => setActive(t.id, t.isActive) })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant</h1>
          <p className="text-sm text-muted-foreground">Tenant nonaktif tidak bisa menerima pesanan baru.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden /> Tambah tenant
        </Button>
      </div>

      <TableWrap caption="Daftar tenant, bagi hasil, dan akun login">
        <thead>
          <tr>
            <Th>Kode</Th>
            <Th>Tenant</Th>
            <Th>Jenis</Th>
            <Th right>Bagi hasil</Th>
            <Th>Akun login</Th>
            <Th>Status</Th>
            <Th right>Aksi</Th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id} className={cn('border-b last:border-b-0', !t.isActive && 'bg-muted/40 text-muted-foreground')}>
              <RowTh>{t.code}</RowTh>
              <Td className="font-medium">{t.name}</Td>
              <Td>{t.kind || '—'}</Td>
              <Td right>{t.sharePercent.toLocaleString('id-ID')}%</Td>
              <Td className="break-all">{t.email}</Td>
              <Td>
                <Pill tone={t.isActive ? 'brand' : 'neutral'}>{t.isActive ? 'Aktif' : 'Nonaktif'}</Pill>
              </Td>
              <Td right>
                <Button variant={t.isActive ? 'destructive' : 'outline'} onClick={() => toggle(t)}>
                  {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  <span className="sr-only"> {t.name}</span>
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <AddTenantDialog
        open={adding}
        onOpenChange={setAdding}
        existing={list}
        onCreate={(t) => {
          setList((prev) => [...prev, { ...t, id: Math.max(0, ...prev.map((x) => x.id)) + 1, kind: '', isOpen: false, isActive: true }])
          setAdding(false)
          toast('Tenant & akun dibuat. Kirim kata sandi sementara ke tenant.')
        }}
      />
    </div>
  )
}
