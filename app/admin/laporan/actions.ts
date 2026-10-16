'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function markRefundDone(orderId: number): Promise<{ error?: string }> {
  await requireRole(['admin'], '/admin/login')
  if (!z.number().int().positive().safe().safeParse(orderId).success) return { error: 'Pesanan tidak valid.' }
  const db = await createClient()
  const { data, error } = await db.rpc('mark_refund_done', { p_order_id: orderId })
  if (error || !data) return { error: 'Refund belum bisa dicatat. Muat ulang halaman dan coba lagi.' }
  revalidatePath('/admin')
  revalidatePath('/admin/laporan')
  return {}
}
