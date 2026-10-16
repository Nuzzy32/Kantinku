import 'server-only'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { readAll } from '@/lib/supabase/read-all'
import type { Refund } from '@/lib/types'

export type ReportRefund = Refund & { id: number }

export function reportPeriod(params: Record<string, string | string[] | undefined>, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const from = params.from ?? `${today.slice(0, 7)}-01`
  const to = params.to ?? today
  const date = z.iso.date().refine((value) => !value.startsWith('0000-')) // PostgreSQL tidak memiliki tahun nol.
  const validFrom = date.safeParse(from)
  const validTo = date.safeParse(to)
  const error = !validFrom.success || !validTo.success ? 'Isi tanggal Dari dan Sampai dengan tanggal yang valid.'
    : from > to ? 'Tanggal Sampai tidak boleh sebelum Dari.'
      : to > today ? 'Tanggal tidak boleh melewati hari ini.' : undefined
  return { from: validFrom.success ? validFrom.data : '', to: validTo.success ? validTo.data : '', today, error }
}

export async function getAdminReport(params: Record<string, string | string[] | undefined>, now = new Date()) {
  const profile = await requireRole(['admin'], '/admin/login')
  const db = await createClient()
  const period = reportPeriod(params, now)
  const [tenants, revenue, refunds] = await Promise.all([
    readAll((from, to) => db.from('tenants').select('id, code, name, revenue_share_percent, is_active')
      .eq('canteen_id', profile.canteen_id).order('id').range(from, to)),
    period.error ? [] : readAll((from, to) => db.from('tenant_daily_revenue')
      .select('tenant_id, gross, canteen_share, tenant_share, tenant:tenants!inner(canteen_id)')
      .eq('tenant.canteen_id', profile.canteen_id).gte('day', period.from).lte('day', period.to)
      .order('day').order('tenant_id').range(from, to)),
    readAll((from, to) => db.from('orders').select('id, subtotal, cancel_reason, tenant:tenants!inner(name, code, canteen_id), checkout:checkouts!inner(customer_name)')
      .eq('tenant.canteen_id', profile.canteen_id).eq('refund_status', 'needed')
      .eq('status', 'cancelled').not('paid_at', 'is', null) // syarat yang sama dengan mark_refund_done
      .order('id').range(from, to)),
  ])

  const totals = new Map<number, { gross: number; canteen: number; tenantShare: number }>()
  for (const r of revenue) {
    if (r.tenant_id === null) continue
    const total = totals.get(r.tenant_id) ?? { gross: 0, canteen: 0, tenantShare: 0 }
    total.gross += r.gross ?? 0
    total.canteen += r.canteen_share ?? 0
    total.tenantShare += r.tenant_share ?? 0
    totals.set(r.tenant_id, total)
  }
  const rows = tenants.map((t) => ({ tenant: t, ...(totals.get(t.id) ?? { gross: 0, canteen: 0, tenantShare: 0 }) }))
  const pendingRefunds: ReportRefund[] = refunds.map((r) => ({
    id: r.id, number: `${r.tenant.code}-${String(r.id % 1000).padStart(3, '0')}`,
    tenantName: r.tenant.name, customerName: r.checkout.customer_name,
    amount: r.subtotal, reason: r.cancel_reason ?? 'Pesanan dibatalkan', done: false,
  }))
  return { period, rows, refunds: pendingRefunds }
}

export type AdminReport = Awaited<ReturnType<typeof getAdminReport>>
