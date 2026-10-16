'use server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function updateOrderStatus(input: unknown): Promise<{ error?: string }> {
  const parsed = z.object({ id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), status: z.enum(['accepted', 'ready', 'completed', 'cancelled']), reason: z.string().trim().min(1).max(100).optional() })
    .refine((v) => v.status !== 'cancelled' || !!v.reason).safeParse(input)
  if (!parsed.success) return { error: 'Pesanan atau alasan tidak valid.' }
  const profile = await requireRole(['tenant'], '/tenant/login')
  const db = await createClient()
  const { data: order, error: readError } = await db.from('orders').select('id').eq('id', parsed.data.id).eq('tenant_id', profile.tenant_id!).maybeSingle()
  if (readError || !order) return { error: 'Pesanan tidak ditemukan. Muat ulang antrean.' }
  const { error } = await db.rpc('set_order_status', { p_order_id: parsed.data.id, p_status: parsed.data.status, ...(parsed.data.reason && { p_reason: parsed.data.reason }) })
  if (error) return { error: 'Gagal mengubah pesanan. Status mungkin sudah berubah; muat ulang dan coba lagi.' }
  revalidatePath('/tenant/rekap')
  revalidatePath('/admin')
  revalidatePath('/admin/laporan')
  return {}
}
