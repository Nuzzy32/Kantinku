import type { Metadata } from 'next'
import QRCode from 'qrcode'
import { AdminShell } from '@/components/admin/admin-shell'
import { TableManager, type PrintableTable } from '@/components/admin/table-manager'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Meja & QR' }

export default async function AdminTablesPage() {
  const profile = await requireRole(['admin'], '/admin/login')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL belum diisi: QR meja butuh alamat aplikasi yang bisa dibuka HP pembeli.')
  const db = await createClient()
  const [tablesRes, canteenRes] = await Promise.all([
    db.from('dining_tables').select('label, qr_token').eq('canteen_id', profile.canteen_id).order('id'),
    db.from('canteens').select('name').eq('id', profile.canteen_id).single(),
  ])
  if (tablesRes.error) throw tablesRes.error
  if (canteenRes.error) throw canteenRes.error

  // QR dibuat di server sebagai SVG (tajam saat dicetak), isinya URL menu meja.
  const tables: PrintableTable[] = await Promise.all(tablesRes.data.map(async (t) => {
    const url = `${appUrl}/t/${t.qr_token}`
    const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })
    return { label: t.label, qrToken: t.qr_token, url, qrSrc: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }
  }))

  return (
    <AdminShell section="meja">
      <TableManager tables={tables} canteenName={canteenRes.data.name} />
    </AdminShell>
  )
}
